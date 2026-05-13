import BottomNav from '../../components/shared/BottomNav'
import { MOCK_STOPS, MOCK_VAN } from '../../lib/mockData'
import VanMap from '../../components/map/VanMap'

export default function AdminDashboardPage() {
  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0">
        <VanMap stops={MOCK_STOPS} van={MOCK_VAN} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold text-sm">Admin Overview</p>
              <p className="text-zinc-500 text-xs">University of Mindanao</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">22</p>
              <p className="text-zinc-500 text-xs">In Queue</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">1</p>
              <p className="text-zinc-500 text-xs">Vans Active</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">7</p>
              <p className="text-zinc-500 text-xs">Stops Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stop queue list */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wider">Stop Queue Counts</p>
          <div className="space-y-2">
            {MOCK_STOPS.map(stop => (
              <div key={stop.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stop.queueCount > 0 ? 'bg-yellow-400' : 'bg-zinc-600'}`} />
                  <span className="text-white text-sm">{stop.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-800 rounded-lg px-2 py-0.5">
                    <span className="text-yellow-400 text-xs font-bold">{stop.queueCount}</span>
                  </div>
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