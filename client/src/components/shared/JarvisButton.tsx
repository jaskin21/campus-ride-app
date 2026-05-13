import { useState } from 'react'

interface JarvisButtonProps {
  readonly onOpen: () => void
}

export default function JarvisButton({ onOpen }: JarvisButtonProps) {
  const [pulse, setPulse] = useState(false)

  const handleClick = () => {
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
    onOpen()
  }

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center justify-center w-14 h-14 rounded-full bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-400/30 transition-all active:scale-95 ${
        pulse ? 'scale-110' : 'scale-100'
      }`}
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-20" />
      <span className="text-2xl">🤖</span>
    </button>
  )
}