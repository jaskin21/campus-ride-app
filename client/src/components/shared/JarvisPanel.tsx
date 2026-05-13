import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'jarvis'
  text: string
}

interface JarvisPanelProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

const MOCK_RESPONSES: Record<string, string> = {
  default: "I'm Jarvis, your CampusRide assistant! I can help you with van ETAs, queue info, and campus directions.",
  eta: "The van is about 4 minutes away from Main Gate. There are 5 students ahead of you.",
  queue: "You're currently #3 in line at Main Gate. The van fits 10 passengers.",
  stop: "BE Building has the shortest queue right now with 2 students waiting.",
}

function getMockResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('eta') || lower.includes('long') || lower.includes('arrive')) return MOCK_RESPONSES.eta
  if (lower.includes('queue') || lower.includes('ahead') || lower.includes('line')) return MOCK_RESPONSES.queue
  if (lower.includes('stop') || lower.includes('short') || lower.includes('least')) return MOCK_RESPONSES.stop
  return MOCK_RESPONSES.default
}

export default function JarvisPanel({ isOpen, onClose }: JarvisPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'jarvis', text: "Hi! I'm Jarvis 👋 Ask me about van ETAs, queue positions, or campus directions." }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 800))
    setIsTyping(false)
    setMessages(prev => [...prev, { role: 'jarvis', text: getMockResponse(userMsg) }])
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendMessage()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Jarvis panel"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      />

      {/* Panel */}
      <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl flex flex-col h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Jarvis</p>
              <p className="text-zinc-500 text-xs">AI Campus Assistant</p>
            </div>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-yellow-400 text-zinc-950 rounded-br-sm'
                    : 'bg-zinc-800 text-white rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 pb-6 border-t border-zinc-800">
          <div className="flex gap-2 items-center bg-zinc-800 rounded-2xl px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Jarvis anything..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim()}
              aria-label="Send message"
              className="text-yellow-400 disabled:text-zinc-600 transition-colors text-lg"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}