import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { TABLE_NAME } from '../shared/tableKeys'

const client = DynamoDBDocumentClient.from( new DynamoDBClient( {} ) )

const ROUTE_ORDER = ['MA', 'PF', 'DPT', 'GET', 'MG', 'BE', 'FEA']
const SPEED_MS = 9 // 9 meters per second ≈ 32 kph
const BOARDING_TIME_MS = 5000 // 5 seconds boarding

interface Stop {
  id: string
  name: string
  lat: number
  lng: number
  active: boolean
}

function haversineDistance( lat1: number, lng1: number, lat2: number, lng2: number ): number {
  const R = 6371000
  const φ1 = ( lat1 * Math.PI ) / 180
  const φ2 = ( lat2 * Math.PI ) / 180
  const Δφ = ( ( lat2 - lat1 ) * Math.PI ) / 180
  const Δλ = ( ( lng2 - lng1 ) * Math.PI ) / 180
  const a =
    Math.sin( Δφ / 2 ) * Math.sin( Δφ / 2 ) +
    Math.cos( φ1 ) * Math.cos( φ2 ) * Math.sin( Δλ / 2 ) * Math.sin( Δλ / 2 )
  const c = 2 * Math.atan2( Math.sqrt( a ), Math.sqrt( 1 - a ) )
  return R * c
}

async function getStopsFromDB(): Promise<Stop[]> {
  const result = await client.send(
    new ScanCommand( {
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk AND begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
        ':pk': 'STOP#',
      },
    } )
  )
  return ( result.Items ?? [] )
    .filter( ( item ) => item.active )
    .map( ( item ) => ( {
      id: item.stopId,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      active: item.active,
    } ) )
    .sort( ( a, b ) => ROUTE_ORDER.indexOf( a.id ) - ROUTE_ORDER.indexOf( b.id ) )
}

export const handler = async () => {
  try {
    const result = await client.send(
      new GetCommand( {
        TableName: TABLE_NAME,
        Key: { PK: 'VAN#van-1', SK: 'POSITION' },
      } )
    )

    if ( !result.Item || !result.Item.isOnline ) return

    const van = result.Item
    const stops = await getStopsFromDB()
    if ( stops.length === 0 ) return

    const now = Date.now()
    const currentIndex = ( van.currentStopIndex as number ) % stops.length
    const nextIndex = ( currentIndex + 1 ) % stops.length
    const nextNextIndex = ( nextIndex + 1 ) % stops.length
    const current = stops[currentIndex]
    const next = stops[nextIndex]
    const nextNext = stops[nextNextIndex]

    if ( van.status === 'boarding' ) {
      const boardingUntil = van.boardingUntil as number ?? 0
      if ( now < boardingUntil ) return

      // Calculate real distance-based duration
      const distance = haversineDistance( current.lat, current.lng, next.lat, next.lng )
      const moveDuration = Math.round( ( distance / SPEED_MS ) * 1000 )

      await client.send(
        new PutCommand( {
          TableName: TABLE_NAME,
          Item: {
            ...van,
            status: 'moving',
            lat: current.lat,
            lng: current.lng,
            fromLat: current.lat,
            fromLng: current.lng,
            toLat: next.lat,
            toLng: next.lng,
            nextStopId: next.id,
            nextStopName: next.name,
            distanceMeters: Math.round( distance ),
            moveStarted: now,
            moveDuration,
            updatedAt: new Date().toISOString(),
          },
        } )
      )
      return
    }

    if ( van.status === 'moving' ) {
      const moveStarted = van.moveStarted as number ?? now
      const moveDuration = van.moveDuration as number ?? 15000
      const elapsed = now - moveStarted

      if ( elapsed >= moveDuration ) {
        // Arrived — start boarding
        await client.send(
          new PutCommand( {
            TableName: TABLE_NAME,
            Item: {
              ...van,
              lat: next.lat,
              lng: next.lng,
              fromLat: next.lat,
              fromLng: next.lng,
              toLat: next.lat,
              toLng: next.lng,
              currentStopIndex: nextIndex,
              currentStopId: next.id,
              currentStopName: next.name,
              nextStopId: nextNext.id,
              nextStop: nextNext.name,
              status: 'boarding',
              boardingUntil: now + BOARDING_TIME_MS,
              updatedAt: new Date().toISOString(),
            },
          } )
        )
      } else {
        // Still moving — calculate interpolated position for frontend
        const t = elapsed / moveDuration
        const fromLat = van.fromLat as number
        const fromLng = van.fromLng as number
        const toLat = van.toLat as number
        const toLng = van.toLng as number
        const lat = fromLat + ( toLat - fromLat ) * t
        const lng = fromLng + ( toLng - fromLng ) * t

        // Update position in DB so frontend always has latest interpolated position
        await client.send(
          new PutCommand( {
            TableName: TABLE_NAME,
            Item: {
              ...van,
              lat,
              lng,
              updatedAt: new Date().toISOString(),
            },
          } )
        )
      }
    }
  } catch ( err ) {
    console.error( err )
  }
}