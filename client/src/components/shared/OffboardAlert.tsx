import { useEffect, useState, useRef } from 'react'

interface OffboardAlertProps {
  readonly isOpen: boolean
  readonly stopName: string
  readonly onAlighted: () => void
  readonly onStayOn: () => void
}

const COUNTDOWN_SECONDS = 30

function CountdownRing( { onComplete }: { readonly onComplete: () => void } ) {
  const [countdown, setCountdown] = useState( COUNTDOWN_SECONDS )
  const onCompleteRef = useRef( onComplete )

  useEffect( () => {
    onCompleteRef.current = onComplete
  }, [onComplete] )

  useEffect( () => {
    const interval = setInterval( () => {
      setCountdown( ( prev ) => {
        if ( prev <= 1 ) {
          clearInterval( interval )
          setTimeout( () => onCompleteRef.current(), 0 )
          return 0
        }
        return prev - 1
      } )
    }, 1000 )
    return () => clearInterval( interval )
  }, [] )

  const pct = ( countdown / COUNTDOWN_SECONDS ) * 100
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - ( pct / 100 ) * circumference

  return (
    <div className="flex justify-center my-5">
      <div className="relative flex items-center justify-center">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#3f3f46" strokeWidth="4" />
          <circle
            cx="36" cy="36" r={radius}
            fill="none"
            stroke={countdown <= 10 ? '#f87171' : '#71717a'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className={`text-2xl font-black ${countdown <= 10 ? 'text-red-400' : 'text-white'}`}>
            {countdown}
          </p>
          <p className="text-zinc-500 text-xs -mt-0.5">sec</p>
        </div>
      </div>
    </div>
  )
}

export default function OffboardAlert( { isOpen, stopName, onAlighted, onStayOn }: OffboardAlertProps ) {
  if ( !isOpen ) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-4xl">🚏</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Arriving at destination
          </p>
          <h2 className="text-white text-xl font-bold">{stopName}</h2>
          <p className="text-zinc-500 text-sm mt-1">Have you alighted?</p>
        </div>

        {/* Countdown — remounts fresh each time isOpen becomes true */}
        <CountdownRing key={stopName} onComplete={onAlighted} />

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAlighted}
            className="w-full bg-white hover:bg-zinc-100 active:scale-95 text-zinc-950 font-bold text-sm rounded-2xl py-3.5 transition-all"
          >
            Yes, alighted ✓
          </button>
          <button
            type="button"
            onClick={onStayOn}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-semibold text-sm rounded-2xl py-3 transition-colors"
          >
            No, staying on
          </button>
        </div>

        <p className="text-zinc-600 text-xs text-center mt-3">
          Auto-offboarded in 30s if no response
        </p>
      </div>
    </div>
  )
}