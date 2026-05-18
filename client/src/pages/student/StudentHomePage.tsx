import { useState, useEffect, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { MOCK_STOPS } from '../../lib/mockData'
import VanMap from '../../components/map/VanMap'
import QueueCard from '../../components/shared/QueueCard'
import JarvisPanel from '../../components/shared/JarvisPanel'
import BottomNav from '../../components/shared/BottomNav'
import JoinQueueModal from '../../components/shared/JoinQueueModal'
import BoardingAlert from '../../components/shared/BoardingAlert'
import OffboardAlert from '../../components/shared/OffboardAlert'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import {
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useConfirmBoardingMutation,
  useSkipBoardingMutation,
  useUpdateDestinationMutation,
  useOffboardPassengerMutation,
} from '../../features/queue/queueApi'
import {
  setQueue,
  clearQueue,
  setBoarded,
  setOffboarded,
  updatePosition,
} from '../../features/queue/queueSlice'
import { useStopQueues } from '../../hooks/useStopQueues'
import { useVanPosition } from '../../hooks/useVanPosition'
import { useBoardingAlert } from '../../hooks/useBoardingAlert'
import { useOffboardAlert } from '../../hooks/useOffboardAlert'
import type { QueueEntry } from '../../features/queue/queueTypes'
import type { VanPosition } from '../../hooks/useVanPosition'
import ChangeDestinationModal from '../../components/shared/ChangeDestinationModal'

const ROUTE_ORDER = ['MA', 'PF', 'DPT', 'GET', 'MG', 'BE', 'FEA']
const AVG_TRAVEL_MS = 22000
const BOARDING_MS = 10000

function calculateEta(
  liveVan: VanPosition & { moveStarted?: number; moveDuration?: number; currentStopId?: string; nextStopId?: string; status?: string },
  studentStop: string
): number | null {
  if ( !liveVan.isOnline ) return null

  const vanCurrentStop = liveVan.currentStopId ?? ''
  const vanNextStop = liveVan.nextStopId ?? ''

  if ( liveVan.status === 'boarding' && vanCurrentStop === studentStop ) return 0

  let timeRemainingMs = 0
  if ( liveVan.status === 'moving' && liveVan.moveStarted && liveVan.moveDuration ) {
    const elapsed = Date.now() - liveVan.moveStarted
    timeRemainingMs = Math.max( 0, liveVan.moveDuration - elapsed )
  }

  const vanNextIndex = ROUTE_ORDER.indexOf( vanNextStop )
  const vanCurrentIndex = ROUTE_ORDER.indexOf( vanCurrentStop )
  const studentIndex = ROUTE_ORDER.indexOf( studentStop )

  if ( studentIndex === -1 ) return null

  let stopsAway = 0

  if ( liveVan.status === 'moving' ) {
    if ( vanNextStop === studentStop ) {
      stopsAway = 0
    } else {
      let idx = vanNextIndex
      while ( idx !== studentIndex ) {
        stopsAway++
        idx = ( idx + 1 ) % ROUTE_ORDER.length
        if ( stopsAway > ROUTE_ORDER.length ) break
      }
    }
  } else {
    if ( vanCurrentStop === studentStop ) {
      stopsAway = 0
    } else {
      let idx = vanCurrentIndex
      while ( idx !== studentIndex ) {
        stopsAway++
        idx = ( idx + 1 ) % ROUTE_ORDER.length
        if ( stopsAway > ROUTE_ORDER.length ) break
      }
    }
  }

  const totalMs = timeRemainingMs + stopsAway * ( AVG_TRAVEL_MS + BOARDING_MS )
  return Math.ceil( totalMs / 1000 )
}

export default function StudentHomePage() {
  const [jarvisOpen, setJarvisOpen] = useState( false )
  const [joinModalOpen, setJoinModalOpen] = useState( false )
  const [changeDestOpen, setChangeDestOpen] = useState( false )
  const [eta, setEta] = useState<number | null>( null )

  const dispatch = useAppDispatch()
  const queueState = useAppSelector( ( state ) => state.queue )
  const liveStops = useStopQueues()
  const liveVan = useVanPosition()

  const [joinQueue, { isLoading: isJoining }] = useJoinQueueMutation()
  const [leaveQueue] = useLeaveQueueMutation()
  const [confirmBoarding] = useConfirmBoardingMutation()
  const [skipBoarding] = useSkipBoardingMutation()
  const [updateDestination] = useUpdateDestinationMutation()
  const [offboardPassenger] = useOffboardPassengerMutation()

  const { showAlert, alertStopName, dismissAlert } = useBoardingAlert(
    queueState.isInQueue ? queueState.stopId : null,
    queueState.isBoarded
  )
  const { showOffboardAlert, offboardStopName, dismissOffboardAlert } = useOffboardAlert(
    queueState.isBoarded,
    queueState.destination
  )

  const etaRef = useRef<ReturnType<typeof setInterval> | null>( null )

  useEffect( () => {
    if ( !queueState.isInQueue || !liveVan.isOnline || queueState.isBoarded ) {
      if ( etaRef.current ) clearInterval( etaRef.current )
      return
    }

    const update = () => {
      const vanExt = liveVan as VanPosition & {
        moveStarted?: number
        moveDuration?: number
        currentStopId?: string
        nextStopId?: string
        status?: string
      }
      const result = calculateEta( vanExt, queueState.stopId ?? '' )
      setEta( result )
    }

    update()
    etaRef.current = setInterval( update, 1000 )
    return () => {
      if ( etaRef.current ) clearInterval( etaRef.current )
    }
  }, [queueState.isInQueue, queueState.isBoarded, queueState.stopId, liveVan] )

  // Restore queue on page load
  useEffect( () => {
    const restoreQueue = async () => {
      try {
        const token = await fetchAuthSession()
        const idToken = token.tokens?.idToken?.toString()
        if ( !idToken ) return
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/queue/user/active`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        )
        if ( !res.ok ) return
        const data = await res.json()
        if ( data.isInQueue ) {
          dispatch( setQueue( {
            stopId: data.stopId,
            destination: data.destination,
            position: data.position,
            joinedAt: data.joinedAt,
            isInQueue: true,
            isBoarded: false,
            boardedAt: null,
          } ) )
        }
      } catch {
        // no active queue
      }
    }
    restoreQueue()
  }, [dispatch] )

  // Poll real position every 5 seconds
  useEffect( () => {
    if ( !queueState.isInQueue || queueState.isBoarded ) return
    let active = true

    const pollPosition = async () => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() ?? ''
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/queue/user/active`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if ( !res.ok ) return
        const data = await res.json()
        if ( active && data.isInQueue && data.position !== queueState.position ) {
          dispatch( updatePosition( data.position ) )
        }
      } catch {
        // silent fail
      }
    }

    pollPosition()
    const interval = setInterval( pollPosition, 5000 )
    return () => {
      active = false
      clearInterval( interval )
    }
  }, [queueState.isInQueue, queueState.isBoarded, queueState.position, dispatch] )

  const handleJoin = async ( stopId: string, destination: string ) => {
    try {
      const result = await joinQueue( { stopId, destination } ).unwrap()
      dispatch( setQueue( {
        stopId: result.stopId ?? stopId,
        destination: result.destination ?? destination,
        position: result.position ?? 1,
        joinedAt: result.joinedAt ?? new Date().toISOString(),
        isInQueue: true,
        isBoarded: false,
        boardedAt: null,
      } ) )
    } catch ( err ) {
      console.error( 'Failed to join queue:', err )
    }
  }

  const handleLeave = async () => {
    try {
      await leaveQueue().unwrap()
      dispatch( clearQueue() )
    } catch ( err ) {
      console.error( 'Failed to leave queue:', err )
    }
  }

  const handleBoard = async () => {
    dismissAlert()
    try {
      await confirmBoarding().unwrap()
      dispatch( setBoarded() )
    } catch ( err ) {
      console.error( 'Failed to confirm boarding:', err )
    }
  }

  const handleSkip = async () => {
    dismissAlert()
    try {
      await skipBoarding().unwrap()
    } catch ( err ) {
      console.error( 'Failed to skip boarding:', err )
    }
  }

  const handleAlighted = async () => {
    dismissOffboardAlert()
    try {
      await offboardPassenger().unwrap()
    } catch {
      // silent fail
    }
    dispatch( setOffboarded() )
  }

  const handleStayOn = () => {
    dismissOffboardAlert()
    setChangeDestOpen( true )
  }

  const handleChangeDestination = async ( newDestinationId: string ) => {
    try {
      await updateDestination( { destination: newDestinationId } ).unwrap()
      dispatch( setQueue( {
        ...queueState,
        destination: newDestinationId,
        isInQueue: false,
        isBoarded: true,
        boardedAt: queueState.boardedAt,
      } ) )
    } catch {
      // silent fail
    }
    setChangeDestOpen( false )
  }

  // Format ETA for display
  const etaDisplay = ( () => {
    if ( eta === null ) return 5
    if ( eta === 0 ) return 0
    return Math.ceil( eta / 60 )
  } )()

  const queueEntry: QueueEntry | null = queueState.isInQueue || queueState.isBoarded
    ? {
      position: queueState.position ?? 1,
      userId: '',
      stopId: queueState.stopId ?? '',
      stopName: queueState.isBoarded
        ? '🚐 Riding'
        : liveStops.find( ( s ) => s.id === queueState.stopId )?.name
        ?? MOCK_STOPS.find( ( s ) => s.id === queueState.stopId )?.name
        ?? '',
      destination: liveStops.find( ( s ) => s.id === queueState.destination )?.name
        ?? MOCK_STOPS.find( ( s ) => s.id === queueState.destination )?.name
        ?? '',
      eta: etaDisplay,
      joinedAt: queueState.joinedAt ?? '',
    }
    : null

  return (
    <div
      className="relative w-full bg-zinc-950 overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Full screen map */}
      <div className="absolute inset-0">
        <VanMap
          stops={liveStops}
          van={liveVan}
          userStopId={queueState.stopId ?? undefined}
        />
      </div>

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-4 flex items-center justify-between gap-2"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-2 flex-shrink-0">
          <p className="text-white text-sm font-semibold">CampusRide</p>
          <p className="text-zinc-500 text-xs">University of Mindanao</p>
        </div>

        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${liveVan.isOnline ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-white text-xs font-medium">
            {liveVan.isOnline ? 'Van Online' : 'Van Offline'}
          </span>
        </div>
      </div>

      {/* Bottom overlay */}
      <div
        className="absolute left-0 right-0 z-10 flex flex-col items-center gap-3 px-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Jarvis pill */}
        <button
          type="button"
          onClick={() => setJarvisOpen( true )}
          className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700
                     hover:border-yellow-400/50 active:scale-95
                     rounded-full px-5 py-2.5 shadow-lg transition-all duration-200"
        >
          <span className="text-base">🤖</span>
          <span className="text-white text-sm font-semibold">Ask Jarvis</span>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        </button>

        {/* Queue card */}
        <div className="w-full">
          <QueueCard
            queue={queueEntry}
            onLeave={handleLeave}
            onJoin={() => setJoinModalOpen( true )}
          />
        </div>
      </div>

      {/* Bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <BottomNav />
      </div>

      {/* Modals & overlays */}
      <JarvisPanel isOpen={jarvisOpen} onClose={() => setJarvisOpen( false )} />
      <JoinQueueModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen( false )}
        onJoin={handleJoin}
        isLoading={isJoining}
      />
      <BoardingAlert
        isOpen={showAlert}
        stopName={alertStopName}
        onBoard={handleBoard}
        onSkip={handleSkip}
      />
      <OffboardAlert
        isOpen={showOffboardAlert}
        stopName={offboardStopName}
        onAlighted={handleAlighted}
        onStayOn={handleStayOn}
      />
      <ChangeDestinationModal
        key={changeDestOpen ? 'open' : 'closed'}
        isOpen={changeDestOpen}
        currentDestinationId={queueState.destination}
        onConfirm={handleChangeDestination}
        onClose={() => setChangeDestOpen( false )}
      />
    </div>
  )
}