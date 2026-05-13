import BottomNav from '../../components/shared/BottomNav'
import { MOCK_STOPS, MOCK_VAN } from '../../lib/mockData'
import VanMap from '../../components/map/VanMap'

export default function DriverPanelPage() {
  const occupancyPct = Math.round((MOCK_VAN.currentPassengers / MOCK_VAN.capacity) * 100)

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0">
        <VanMap stops={MOCK_STOPS} van={MOCK_VAN} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Driver Panel</p>
              <p className="text-zinc-500 text-xs">{MOCK_VAN.driverName}</p>
            </div>

            {/* Online toggle */}
            <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/30 rounded-xl px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">Online</span>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-500 text-xs">Passengers</span>
              <span className="text-white text-xs font-semibold">
                {MOCK_VAN.currentPassengers}/{MOCK_VAN.capacity}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-yellow-400 h-1.5 rounded-full transition-all"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Next stop + queue breakdown */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4">
          {/* Next stop */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800">
            <div>
              <p className="text-zinc-500 text-xs">Next Stop</p>
              <p className="text-white font-semibold">{MOCK_VAN.nextStop}</p>
            </div>
            <div className="text-right">
              <p className="text-yellow-400 font-bold">~3 min</p>
              <p className="text-zinc-500 text-xs">ETA</p>
            </div>
          </div>

          {/* Queue breakdown */}
          <p className="text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wider">
            Upcoming Queues
          </p>
          <div className="space-y-2">
            {MOCK_STOPS.filter(s => s.queueCount > 0).map(stop => (
              <div key={stop.id} className="flex items-center justify-between">
                <span className="text-white text-sm">{stop.name}</span>
                <div className="bg-zinc-800 rounded-lg px-2 py-0.5">
                  <span className="text-yellow-400 text-xs font-bold">
                    {stop.queueCount} waiting
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}