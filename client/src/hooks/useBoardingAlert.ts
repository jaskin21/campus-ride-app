import { useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface VanStatus {
  isOnline: boolean
  currentStopId?: string
  currentStopName?: string
  status?: string
}

export function useBoardingAlert(userStopId: string | null) {
  const [showAlert, setShowAlert] = useState(false)
  const [alertStopName, setAlertStopName] = useState('')

  useEffect(() => {
    if (!userStopId) return

    let active = true

    const checkVan = async () => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() ?? ''

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/van/position`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return

        const van: VanStatus = await res.json()

        if (
          active &&
          van.isOnline &&
          van.status === 'boarding' &&
          van.currentStopId === userStopId
        ) {
          setAlertStopName(van.currentStopName ?? userStopId)
          setShowAlert(true)
        }
      } catch {
        // silent fail
      }
    }

    checkVan()
    const interval = setInterval(checkVan, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [userStopId])

  const dismissAlert = () => setShowAlert(false)

  return { showAlert, alertStopName, dismissAlert }
}