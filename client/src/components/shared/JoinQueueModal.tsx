import { useState } from 'react'
import { MOCK_STOPS } from '../../lib/mockData'

interface JoinQueueModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onJoin: (stopId: string, destination: string) => Promise<void>
  readonly isLoading: boolean
}

export default function JoinQueueModal({
  isOpen,
  onClose,
  onJoin,
  isLoading,
}: JoinQueueModalProps) {
  const [selectedStop, setSelectedStop] = useState('')
  const [selectedDestination, setSelectedDestination] = useState('')

  const availableDestinations = MOCK_STOPS.filter(
    (s) => s.active && s.id !== selectedStop
  )

  const handleJoin = async () => {
    if (!selectedStop || !selectedDestination) return
    await onJoin(selectedStop, selectedDestination)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl w-full p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-semibold text-lg">Join Queue</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Select your stop and destination
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Stop selection */}
        <div className="mb-4">
          <label
            htmlFor="stop"
            className="text-zinc-400 text-sm mb-2 block"
          >
            Your current stop
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_STOPS.filter((s) => s.active).map((stop) => (
              <button
                key={stop.id}
                type="button"
                onClick={() => {
                  setSelectedStop(stop.id)
                  setSelectedDestination('')
                }}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  selectedStop === stop.id
                    ? 'bg-yellow-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {stop.name}
              </button>
            ))}
          </div>
        </div>

        {/* Destination selection */}
        {selectedStop && (
          <div className="mb-6">
            <label
              htmlFor="destination"
              className="text-zinc-400 text-sm mb-2 block"
            >
              Destination
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableDestinations.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => setSelectedDestination(stop.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    selectedDestination === stop.id
                      ? 'bg-yellow-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {stop.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Join button */}
        <button
          type="button"
          onClick={handleJoin}
          disabled={!selectedStop || !selectedDestination || isLoading}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
        >
          {isLoading ? 'Joining...' : 'Join Queue'}
        </button>
      </div>
    </div>
  )
}