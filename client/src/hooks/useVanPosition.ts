import { useEffect, useState, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { MOCK_VAN } from '../lib/mockData'
import type { Van } from '../lib/mockData'

interface VanData {
  vanId?: string
  driverName?: string
  lat: number
  lng: number
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  moveStarted?: number
  moveDuration?: number
  capacity?: number
  currentPassengers?: number
  isOnline?: boolean
  nextStop?: string
  currentStopId?: string
  currentStopName?: string
  nextStopId?: string
  status?: string
  distanceMeters?: number
  boardingUntil?: number
  passengers?: { userId: string; destination: string; boardedAt: string }[]
}

function easeInOut( t: number ): number {
  return t < 0.5 ? 2 * t * t : -1 + ( 4 - 2 * t ) * t
}

export interface VanPosition extends Van {
  currentStopId?: string
  currentStopName?: string
  nextStopId?: string
  status?: string
  animProgress?: number
  distanceMeters?: number
  moveStarted?: number
  moveDuration?: number
  passengers?: { userId: string; destination: string; boardedAt: string }[]
}

export function useVanPosition(): VanPosition {
  const [van, setVan] = useState<VanPosition>( {
    ...MOCK_VAN,
    animProgress: 0,
  } )

  const rawDataRef = useRef<VanData | null>( null )
  const animFrameRef = useRef<number>( 0 )
  const isAnimatingRef = useRef( false )

  // 60fps animation loop
  useEffect( () => {
    const animate = () => {
      const data = rawDataRef.current

      if (
        data &&
        data.status === 'moving' &&
        data.fromLat !== undefined &&
        data.fromLng !== undefined &&
        data.toLat !== undefined &&
        data.toLng !== undefined &&
        data.moveStarted !== undefined &&
        data.moveDuration !== undefined
      ) {
        const now = Date.now()
        const elapsed = now - data.moveStarted
        const t = Math.min( elapsed / data.moveDuration, 1 )
        const eased = easeInOut( t )

        const lat = data.fromLat + ( data.toLat - data.fromLat ) * eased
        const lng = data.fromLng + ( data.toLng - data.fromLng ) * eased

        isAnimatingRef.current = true

        setVan( prev => ( {
          ...prev,
          lat,
          lng,
          animProgress: t,
        } ) )
      } else {
        isAnimatingRef.current = false
      }

      animFrameRef.current = requestAnimationFrame( animate )
    }

    animFrameRef.current = requestAnimationFrame( animate )
    return () => cancelAnimationFrame( animFrameRef.current )
  }, [] )

  // Fetch van data every 2 seconds
  useEffect( () => {
    let active = true

    const fetchPosition = async () => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() ?? ''
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/van/position`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if ( !res.ok ) return
        const data: VanData = await res.json()
        if ( !active ) return

        // Always update rawData for animation loop
        rawDataRef.current = data

        setVan( prev => ( {
          ...prev,
          id: data.vanId ?? 'van-1',
          driverName: data.driverName ?? 'Demo Driver',
          capacity: data.capacity ?? 10,
          currentPassengers: data.currentPassengers ?? 0,
          isOnline: data.isOnline ?? false,
          nextStop: data.nextStop ?? '',
          speed: 20,
          currentStopId: data.currentStopId,
          currentStopName: data.currentStopName,
          nextStopId: data.nextStopId,
          status: data.status,
          distanceMeters: data.distanceMeters,
          moveStarted: data.moveStarted,
          moveDuration: data.moveDuration,
          passengers: data.passengers ?? [],
          // Only set lat/lng directly when NOT moving
          // When moving, the animation loop handles position
          ...( data.status !== 'moving' && {
            lat: data.lat,
            lng: data.lng,
            animProgress: data.status === 'boarding' ? 1 : 0,
          } ),
        } ) )
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