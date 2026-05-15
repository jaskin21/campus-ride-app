import { useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { MOCK_STOPS } from '../lib/mockData'
import type { Stop } from '../lib/mockData'

async function getToken() {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() ?? ''
}

async function fetchStops(token: string): Promise<Stop[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/stops`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return MOCK_STOPS
  const data = await res.json()
  return data.stops ?? MOCK_STOPS
}

async function fetchStopCount(stopId: string, token: string): Promise<number> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/queue/${stopId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return 0
  const data = await res.json()
  return data.count ?? 0
}

export function useStopQueues() {
  const [stops, setStops] = useState<Stop[]>(MOCK_STOPS)

  useEffect(() => {
    let active = true

    const fetchAll = async () => {
      try {
        const token = await getToken()
        const baseStops = await fetchStops(token)
        const updated = await Promise.all(
          baseStops.map(async (stop) => ({
            ...stop,
            queueCount: await fetchStopCount(stop.id, token),
          }))
        )
        if (active) setStops(updated)
      } catch {
        // keep previous state on error
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return stops
}