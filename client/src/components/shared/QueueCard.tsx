import type { QueueEntry } from '../../features/queue/queueTypes'

interface QueueCardProps {
  readonly queue: QueueEntry | null
  readonly onLeave?: () => void
  readonly onJoin?: () => void
}


export default function QueueCard({ queue, onLeave, onJoin }: QueueCardProps) {
  if (!queue) {
    return (
      <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4 mx-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs">Not in queue</p>
            <p className="text-white text-sm font-semibold mt-0.5">Join a stop to ride</p>
          </div>
          <button
            onClick={onJoin}
            className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Join Queue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/90 backdrop-blur-sm border border-yellow-400/30 rounded-2xl p-4 mx-4">
      {/* Position badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 text-zinc-950 text-xs font-black px-2.5 py-1 rounded-lg">
            #{queue.position}
          </div>
          <span className="text-zinc-400 text-xs">in line</span>
        </div>
        <button
          onClick={onLeave}
          className="text-zinc-500 hover:text-red-400 text-xs transition-colors"
        >
          Leave queue
        </button>
      </div>

      {/* Stop info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">{queue.stopName}</p>
          <p className="text-zinc-500 text-xs mt-0.5">→ {queue.destination}</p>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-sm font-bold">{queue.eta} min</p>
          <p className="text-zinc-500 text-xs">ETA</p>
        </div>
      </div>
    </div>
  )
}