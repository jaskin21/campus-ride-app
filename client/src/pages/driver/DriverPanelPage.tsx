import { useState, useEffect } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import VanMap from '../../components/map/VanMap'
import { useVanPosition } from '../../hooks/useVanPosition'
import { useStopQueues } from '../../hooks/useStopQueues'
import { useToggleOnlineMutation } from '../../features/driver/driverApi'

interface Passenger {
  userId: string
  destination: string
  boardedAt: string
}

function getOccupancyColor( pct: number ): string {
  if ( pct >= 90 ) return 'bg-red-400'
  if ( pct >= 70 ) return 'bg-yellow-400'
  return 'bg-green-400'
}

function getToggleLabel( isToggling: boolean, isOnline: boolean ): string {
  if ( isToggling ) return '...'
  return isOnline ? 'Online' : 'Offline'
}

export default function DriverPanelPage() {
  const [isOnline, setIsOnline] = useState( false )
  const [isToggling, setIsToggling] = useState( false )
  const [isBoardingOpen, setIsBoardingOpen] = useState( false )
  const [isPassengersOpen, setIsPassengersOpen] = useState( true )

  const liveVan = useVanPosition()
  const liveStops = useStopQueues()
  const [toggleOnline] = useToggleOnlineMutation()

  useEffect( () => {
    const timer = setTimeout( () => {
      setIsOnline( liveVan.isOnline )
    }, 0 )
    return () => clearTimeout( timer )
  }, [liveVan.isOnline] )

  const handleToggle = async () => {
    setIsToggling( true )
    const newStatus = !isOnline
    try {
      setIsOnline( newStatus )
      await toggleOnline( { isOnline: newStatus } )
    } catch {
      setIsOnline( !newStatus )
    } finally {
      setIsToggling( false )
    }
  }

  const occupancyPct = Math.round( ( liveVan.currentPassengers / liveVan.capacity ) * 100 )
  const occupancyColor = getOccupancyColor( occupancyPct )

  const vanAny = liveVan as unknown as {
    currentStopId?: string
    passengers?: Passenger[]
    status?: string
  }

  const currentStopQueue = liveStops.find( s => s.id === vanAny.currentStopId )
  const isBoardingStop = liveVan.isOnline && currentStopQueue !== undefined
  const passengers: Passenger[] = vanAny.passengers ?? []

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0 z-0">
        <VanMap stops={liveStops} van={liveVan} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Driver Panel</p>
              <p className="text-zinc-500 text-xs">{liveVan.driverName}</p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isOnline
                  ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
              {getToggleLabel( isToggling, isOnline )}
            </button>
          </div>

          {/* Capacity bar */}
          {isOnline && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-500 text-xs">Passengers</span>
                <span className={`text-xs font-bold ${occupancyPct >= 90 ? 'text-red-400' :
                    occupancyPct >= 70 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                  {liveVan.currentPassengers}/{liveVan.capacity}
                  {occupancyPct >= 90 ? ' — Full' : ''}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${occupancyColor}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Next stop */}
          {isOnline && liveVan.nextStop && (
            <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">→</span>
                <span className="text-zinc-400 text-xs">Next Stop</span>
              </div>
              <span className="text-white text-xs font-semibold">{liveVan.nextStop}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-4 space-y-2">

        {/* Passengers on board */}
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPassengersOpen( prev => !prev )}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${passengers.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
              <p className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                On Board — {passengers.length}/{liveVan.capacity}
              </p>
            </div>
            <span className="text-zinc-400 text-lg">
              {isPassengersOpen ? '▾' : '▸'}
            </span>
          </button>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isPassengersOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 pb-4 space-y-2">
              {passengers.length === 0 && (
                <p className="text-zinc-600 text-xs text-center py-2">No passengers on board</p>
              )}
              {passengers.map( ( p, idx ) => {
                const destStop = liveStops.find( s => s.id === p.destination )
                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between bg-zinc-800 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center">
                        <span className="text-zinc-400 text-xs font-bold">#{idx + 1}</span>
                      </div>
                      <span className="text-zinc-400 text-xs">Passenger {idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-600 text-xs">→</span>
                      <span className="text-yellow-400 text-xs font-semibold">
                        {destStop?.name ?? p.destination}
                      </span>
                    </div>
                  </div>
                )
              } )}
            </div>
          </div>
        </div>

        {/* Queue per stop */}
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
          {isBoardingStop && currentStopQueue && (
            <div className="px-4 py-3 border-b border-zinc-800 bg-yellow-400/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">
                    Boarding at {currentStopQueue.name}
                  </p>
                </div>
                <span className="text-white text-xs font-bold">
                  {currentStopQueue.queueCount} waiting
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsBoardingOpen( prev => !prev )}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                Queue Per Stop
              </p>
            </div>
            <span className="text-zinc-400 text-lg">
              {isBoardingOpen ? '▾' : '▸'}
            </span>
          </button>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isBoardingOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 pb-4 space-y-2 overflow-y-auto max-h-56">
              {liveStops.filter( s => s.active ).map( stop => (
                <div key={stop.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stop.queueCount > 0 ? 'bg-yellow-400' : 'bg-zinc-600'}`} />
                    <span className="text-white text-sm">{stop.name}</span>
                    {stop.id === vanAny.currentStopId && (
                      <span className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded-lg">
                        Here
                      </span>
                    )}
                  </div>
                  {stop.queueCount > 0 ? (
                    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2 py-0.5">
                      <span className="text-yellow-400 text-xs font-bold">
                        {stop.queueCount} waiting
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-600 text-xs">Empty</span>
                  )}
                </div>
              ) )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}