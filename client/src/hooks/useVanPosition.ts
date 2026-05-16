import { useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { MOCK_VAN } from '../lib/mockData'
import type { Van } from '../lib/mockData'

interface VanWithPassengers extends Van {
  currentStopId?: string
  currentStopName?: string
  status?: string
  passengers?: {
    userId: string
    destination: string
    boardedAt: string
  }[]
}

async function getToken() {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() ?? ''
}

export function useVanPosition() {
  const [van, setVan] = useState<VanWithPassengers>( MOCK_VAN )

  useEffect( () => {
    let active = true

    const fetchPosition = async () => {
      try {
        const token = await getToken()
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/van/position`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if ( !res.ok ) return
        const data = await res.json()
        if ( active ) {
          setVan( {
            id: data.vanId ?? 'van-1',
            driverName: data.driverName ?? 'Demo Driver',
            lat: data.lat ?? MOCK_VAN.lat,
            lng: data.lng ?? MOCK_VAN.lng,
            capacity: data.capacity ?? 10,
            currentPassengers: data.currentPassengers ?? 0,
            isOnline: data.isOnline ?? false,
            nextStop: data.nextStop ?? '',
            speed: 20,
            currentStopId: data.currentStopId,
            currentStopName: data.currentStopName,
            status: data.status,
            passengers: data.passengers ?? [],
          } )
        }
      } catch {
        // keep previous state
      }
    }

    fetchPosition()
    const interval = setInterval( fetchPosition, 2000 )
    return () => {
      active = false
      clearInterval( interval )
    }
  }, [] )

  return van
}