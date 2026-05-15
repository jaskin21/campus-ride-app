import { useEffect, useState } from 'react'

interface BoardingAlertProps {
  readonly isOpen: boolean
  readonly stopName: string
  readonly onBoard: () => void
  readonly onSkip: () => void
}

const COUNTDOWN_SECONDS = 20

export default function BoardingAlert({ isOpen, stopName, onBoard, onSkip }: BoardingAlertProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    if (!isOpen) {
      setCountdown(COUNTDOWN_SECONDS)
      return
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onSkip()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, onSkip])

  if (!isOpen) return null

  const pct = (countdown / COUNTDOWN_SECONDS) * 100
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Alert card */}
      <div className="relative bg-zinc-900 border border-yellow-400/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl shadow-yellow-400/10">
        {/* Van animation */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
              <span className="text-4xl animate-bounce">🚐</span>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-zinc-900 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Van has arrived
          </p>
          <h2 className="text-white text-xl font-bold">{stopName}</h2>
          <p className="text-zinc-500 text-sm mt-1">Are you boarding this van?</p>
        </div>

        {/* Countdown ring */}
        <div className="flex justify-center my-5">
          <div className="relative flex items-center justify-center">
            <svg width="72" height="72" className="-rotate-90">
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="#3f3f46"
                strokeWidth="4"
              />
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke={countdown <= 5 ? '#f87171' : '#facc15'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            <div className="absolute text-center">
              <p className={`text-2xl font-black ${countdown <= 5 ? 'text-red-400' : 'text-white'}`}>
                {countdown}
              </p>
              <p className="text-zinc-500 text-xs -mt-0.5">sec</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-2xl py-3.5 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onBoard}
            className="flex-2 flex-grow-[2] bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-zinc-950 font-bold text-sm rounded-2xl py-3.5 transition-all shadow-lg shadow-yellow-400/30"
          >
            Board Van 🚐
          </button>
        </div>

        <p className="text-zinc-600 text-xs text-center mt-3">
          No response in {countdown}s — auto skipped
        </p>
      </div>
    </div>
  )
}