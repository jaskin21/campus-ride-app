import { useEffect, useState, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface VanStatus {
  isOnline: boolean
  currentStopId?: string
  currentStopName?: string
  nextStopId?: string
  status?: string
  boardingUntil?: number
}

export function useBoardingAlert(
  userStopId: string | null,
  isBoarded: boolean
) {
  const [showAlert, setShowAlert] = useState( false )
  const [alertStopName, setAlertStopName] = useState( '' )
  const hasShownRef = useRef( false )
  const prevStopIdRef = useRef<string | null>( null )

  useEffect( () => {
    if ( !userStopId || isBoarded ) return

    let active = true

    const checkVan = async () => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() ?? ''
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/van/position`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if ( !res.ok ) return
        const van: VanStatus = await res.json()
        if ( !active ) return

        // Reset hasShown when userStopId changes
        if ( prevStopIdRef.current !== userStopId ) {
          prevStopIdRef.current = userStopId
          hasShownRef.current = false
        }

        // Reset if van is nowhere near student's stop
        if (
          van.currentStopId !== userStopId &&
          van.nextStopId !== userStopId
        ) {
          hasShownRef.current = false
          return
        }

        // Fire when van is boarding at student's stop
        // AND boarding window is still open
        if (
          van.status === 'boarding' &&
          van.currentStopId === userStopId &&
          !hasShownRef.current
        ) {
          const now = Date.now()
          const boardingUntil = van.boardingUntil ?? 0

          // Only show if boarding window is still open
          if ( now < boardingUntil ) {
            hasShownRef.current = true
            setTimeout( () => {
              setAlertStopName( van.currentStopName ?? userStopId )
              setShowAlert( true )
            }, 0 )
          }
        }
      } catch {
        // silent fail
      }
    }

    checkVan()
    // Poll every 1 second for faster detection
    const interval = setInterval( checkVan, 1000 )
    return () => {
      active = false
      clearInterval( interval )
    }
  }, [userStopId, isBoarded] )

  const dismissAlert = () => setShowAlert( false )

  return { showAlert, alertStopName, dismissAlert }
}