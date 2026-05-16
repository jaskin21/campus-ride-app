import { useEffect, useState, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface VanStatus {
  isOnline: boolean
  currentStopId?: string
  currentStopName?: string
  status?: string
}

export function useBoardingAlert( userStopId: string | null, isBoarded: boolean ) {
  const [showAlert, setShowAlert] = useState( false )
  const [alertStopName, setAlertStopName] = useState( '' )
  const hasShownRef = useRef( false )
  const showAlertRef = useRef( showAlert )

  useEffect( () => {
    showAlertRef.current = showAlert
  }, [showAlert] )

  // Reset hasShown when stop changes
  useEffect( () => {
    hasShownRef.current = false
  }, [userStopId] )

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

        if (
          van.isOnline &&
          van.status === 'boarding' &&
          van.currentStopId === userStopId &&
          !hasShownRef.current
        ) {
          hasShownRef.current = true
          setAlertStopName( van.currentStopName ?? userStopId )
          setShowAlert( true )
        } else if ( van.currentStopId !== userStopId ) {
          hasShownRef.current = false
          setShowAlert( false )
        }
      } catch {
        // silent fail
      }
    }

    checkVan()
    const interval = setInterval( checkVan, 3000 )
    return () => {
      active = false
      clearInterval( interval )
    }
  }, [userStopId, isBoarded] )

  const dismissAlert = () => {
    setShowAlert( false )
  }

  return { showAlert, alertStopName, dismissAlert }
}