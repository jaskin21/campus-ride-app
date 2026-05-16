import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { MOCK_STOPS } from '../../lib/mockData'
import VanMap from '../../components/map/VanMap'
import QueueCard from '../../components/shared/QueueCard'
import JarvisButton from '../../components/shared/JarvisButton'
import JarvisPanel from '../../components/shared/JarvisPanel'
import BottomNav from '../../components/shared/BottomNav'
import JoinQueueModal from '../../components/shared/JoinQueueModal'
import BoardingAlert from '../../components/shared/BoardingAlert'
import OffboardAlert from '../../components/shared/OffboardAlert'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useJoinQueueMutation, useLeaveQueueMutation, useConfirmBoardingMutation, useSkipBoardingMutation } from '../../features/queue/queueApi'
import { setQueue, clearQueue, setBoarded, setOffboarded } from '../../features/queue/queueSlice'
import { useStopQueues } from '../../hooks/useStopQueues'
import { useVanPosition } from '../../hooks/useVanPosition'
import { useBoardingAlert } from '../../hooks/useBoardingAlert'
import { useOffboardAlert } from '../../hooks/useOffboardAlert'
import type { QueueEntry } from '../../features/queue/queueTypes'
import ChangeDestinationModal from '../../components/shared/ChangeDestinationModal'
import { useUpdateDestinationMutation, useOffboardPassengerMutation } from '../../features/queue/queueApi'

export default function StudentHomePage() {
  const [jarvisOpen, setJarvisOpen] = useState( false )
  const [joinModalOpen, setJoinModalOpen] = useState( false )
  const [changeDestOpen, setChangeDestOpen] = useState( false )

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

  // Build queue entry for QueueCard
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
      eta: 5,
      joinedAt: queueState.joinedAt ?? '',
    }
    : null

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0">
        <VanMap
          stops={liveStops}
          van={liveVan}
          userStopId={queueState.stopId ?? undefined}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 flex items-center justify-between">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-2">
          <p className="text-white text-sm font-semibold">CampusRide</p>
          <p className="text-zinc-500 text-xs">University of Mindanao</p>
        </div>

        {/* Van status pill */}
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${liveVan.isOnline ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-white text-xs font-medium">
            {liveVan.isOnline ? 'Van Online' : 'Van Offline'}
          </span>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-24 left-0 right-0 z-10 flex flex-col gap-3">
        {/* Queue card */}
        <QueueCard
          queue={queueEntry}
          onLeave={handleLeave}
          onJoin={() => setJoinModalOpen( true )}
        />

        {/* Jarvis button */}
        <div className="flex justify-end px-4">
          <JarvisButton onOpen={() => setJarvisOpen( true )} />
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav />

      {/* Jarvis panel */}
      <JarvisPanel isOpen={jarvisOpen} onClose={() => setJarvisOpen( false )} />

      {/* Join queue modal */}
      <JoinQueueModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen( false )}
        onJoin={handleJoin}
        isLoading={isJoining}
      />

      {/* Boarding alert */}
      <BoardingAlert
        isOpen={showAlert}
        stopName={alertStopName}
        onBoard={handleBoard}
        onSkip={handleSkip}
      />

      {/* Offboard alert */}
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