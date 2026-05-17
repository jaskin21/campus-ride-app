import { useState, useRef, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface Message {
  role: 'user' | 'jarvis'
  text: string
}

interface JarvisPanelProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item( index: number ): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item( index: number ): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  readonly isFinal: boolean
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ( ( event: SpeechRecognitionEvent ) => void ) | null
  onerror: ( ( event: Event ) => void ) | null
  onend: ( () => void ) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

async function sendToJarvis(
  message: string,
  history: Message[],
  token: string,
  retries = 1
): Promise<string> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/jarvis/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify( {
          message,
          history: history.map( ( m ) => ( {
            role: m.role === 'jarvis' ? 'assistant' : 'user',
            content: m.text,
          } ) ),
        } ),
      }
    )
    if ( !res.ok && retries > 0 ) {
      await new Promise( r => setTimeout( r, 2000 ) )
      return sendToJarvis( message, history, token, retries - 1 )
    }
    if ( !res.ok ) return "Sorry, I'm having trouble connecting right now."
    const data = await res.json()
    return data.reply ?? "Sorry, I couldn't process that."
  } catch {
    if ( retries > 0 ) {
      await new Promise( r => setTimeout( r, 2000 ) )
      return sendToJarvis( message, history, token, retries - 1 )
    }
    return "Sorry, I'm having trouble connecting right now."
  }
}

function speak( text: string ): Promise<void> {
  return new Promise( ( resolve ) => {
    if ( !window.speechSynthesis ) { resolve(); return }
    window.speechSynthesis.cancel()
    setTimeout( () => {
      const utterance = new SpeechSynthesisUtterance( text )
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.lang = 'en-US'
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak( utterance )
    }, 100 )
  } )
}

export default function JarvisPanel( { isOpen, onClose }: JarvisPanelProps ) {
  const [messages, setMessages] = useState<Message[]>( [
    { role: 'jarvis', text: "Hi! I'm Jarvis 👋 Ask me about van ETAs, queue positions, or campus directions." }
  ] )
  const [input, setInput] = useState( '' )
  const [isTyping, setIsTyping] = useState( false )
  const [isVoiceMode, setIsVoiceMode] = useState( false )
  const [isListening, setIsListening] = useState( false )
  const [isSpeaking, setIsSpeaking] = useState( false )
  const [transcript, setTranscript] = useState( '' )
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>( 'idle' )

  const bottomRef = useRef<HTMLDivElement>( null )
  const recognitionRef = useRef<SpeechRecognition | null>( null )
  const messagesRef = useRef<Message[]>( messages )
  const voiceSupported = useState( () =>
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  )[0]

  useEffect( () => {
    messagesRef.current = messages
  }, [messages] )

  useEffect( () => {
    bottomRef.current?.scrollIntoView( { behavior: 'smooth' } )
  }, [messages] )

  useEffect( () => {
    if ( !isOpen ) {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      setTimeout( () => {
        setIsListening( false )
        setTranscript( '' )
        setIsVoiceMode( false )
        setVoiceStatus( 'idle' )
      }, 0 )
    }
  }, [isOpen] )

  const processMessage = async ( text: string, withVoice: boolean ) => {
    const updatedMessages: Message[] = [...messagesRef.current, { role: 'user', text }]
    setMessages( updatedMessages )
    messagesRef.current = updatedMessages

    if ( withVoice ) setVoiceStatus( 'thinking' )
    else setIsTyping( true )

    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString() ?? ''
      const reply = await sendToJarvis( text, messagesRef.current.slice( 0, -1 ), token )

      const finalMessages: Message[] = [...updatedMessages, { role: 'jarvis', text: reply }]
      setMessages( finalMessages )
      messagesRef.current = finalMessages

      if ( withVoice ) {
        setVoiceStatus( 'speaking' )
        setIsSpeaking( true )
        await speak( reply )
        setIsSpeaking( false )
        setVoiceStatus( 'idle' )
        // Auto start listening again after Jarvis speaks
        setTimeout( () => {
          if ( isVoiceMode ) startListening()
        }, 500 )
      }
    } catch {
      const errorMsg = "Sorry, I'm unavailable right now."
      setMessages( prev => [...prev, { role: 'jarvis', text: errorMsg }] )
      if ( withVoice ) {
        setVoiceStatus( 'idle' )
        await speak( errorMsg )
      }
    } finally {
      if ( !withVoice ) setIsTyping( false )
    }
  }

  const startListening = () => {
    const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if ( !SpeechRecognitionClass ) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = ( event: SpeechRecognitionEvent ) => {
      const result = event.results[event.results.length - 1]
      const text = result[0].transcript
      setTranscript( text )
      if ( result.isFinal ) {
        setTranscript( '' )
        setIsListening( false )
        processMessage( text, true )
      }
    }

    recognition.onerror = () => {
      setIsListening( false )
      setVoiceStatus( 'idle' )
      setTranscript( '' )
    }

    recognition.onend = () => {
      setIsListening( false )
      if ( voiceStatus === 'listening' ) setVoiceStatus( 'idle' )
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening( true )
    setVoiceStatus( 'listening' )
    setTranscript( '' )
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening( false )
    setVoiceStatus( 'idle' )
    setTranscript( '' )
  }

  const sendTextMessage = async () => {
    if ( !input.trim() || isTyping ) return
    const text = input.trim()
    setInput( '' )
    await processMessage( text, false )
  }

  const handleKey = ( e: React.KeyboardEvent ) => {
    if ( e.key === 'Enter' ) sendTextMessage()
  }

  const enterVoiceMode = () => {
    setIsVoiceMode( true )
    setTimeout( () => startListening(), 300 )
  }

  const exitVoiceMode = () => {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    setIsVoiceMode( false )
    setIsListening( false )
    setIsSpeaking( false )
    setVoiceStatus( 'idle' )
    setTranscript( '' )
  }

  if ( !isOpen ) return null

  // ─── Voice Mode UI ────────────────────────────────
  if ( isVoiceMode ) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-between py-16 px-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={exitVoiceMode}
            className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Back to chat
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Jarvis identity */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Outer pulse rings */}
            {( isListening || isSpeaking ) && (
              <>
                <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-ping scale-150" />
                <div className="absolute inset-0 rounded-full bg-yellow-400/5 animate-ping scale-200" style={{ animationDelay: '0.3s' }} />
              </>
            )}

            {/* Main circle */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking || voiceStatus === 'thinking'}
              className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                  ? 'bg-red-500/20 border-4 border-red-400 scale-110'
                  : isSpeaking
                    ? 'bg-yellow-400/20 border-4 border-yellow-400'
                    : voiceStatus === 'thinking'
                      ? 'bg-zinc-800 border-4 border-zinc-600'
                      : 'bg-zinc-800 border-4 border-zinc-700 hover:border-yellow-400 hover:bg-yellow-400/10 active:scale-95'
                }`}
            >
              <span className="text-6xl">
                {voiceStatus === 'thinking' ? '🤔' : voiceStatus === 'speaking' ? '🤖' : '🎙️'}
              </span>
            </button>
          </div>

          {/* Status text */}
          <div className="text-center">
            <p className="text-white font-semibold text-lg">
              {voiceStatus === 'listening' ? 'Listening...' :
                voiceStatus === 'thinking' ? 'Thinking...' :
                  voiceStatus === 'speaking' ? 'Jarvis is speaking' :
                    'Tap to speak'}
            </p>
            {transcript && (
              <p className="text-yellow-400 text-sm mt-2 italic">"{transcript}"</p>
            )}
          </div>
        </div>

        {/* Last Jarvis response */}
        <div className="w-full">
          {messages.length > 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <p className="text-zinc-500 text-xs mb-1">Jarvis said:</p>
              <p className="text-white text-sm">
                {messages[messages.length - 1].role === 'jarvis'
                  ? messages[messages.length - 1].text
                  : messages[messages.length - 2]?.text ?? ''}
              </p>
            </div>
          )}

          {/* Auto-listen indicator */}
          {voiceStatus === 'idle' && !isListening && (
            <p className="text-zinc-600 text-xs text-center">
              Tap the mic to speak with Jarvis
            </p>
          )}
        </div>
      </div>
    )
  }

  // ─── Text Mode UI ─────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Jarvis panel"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
        onClick={onClose}
        onKeyDown={( e ) => { if ( e.key === 'Escape' ) onClose() }}
      />

      {/* Panel */}
      <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl flex flex-col h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-lg">
                🤖
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-zinc-900" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Jarvis</p>
              <p className="text-zinc-500 text-xs">AI Campus Assistant • Llama 3.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Switch to voice mode */}
            {voiceSupported && (
              <button
                type="button"
                onClick={enterVoiceMode}
                aria-label="Switch to voice mode"
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-yellow-400/20 hover:border-yellow-400 border border-zinc-700 flex items-center justify-center transition-all"
              >
                🎙️
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-500 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map( ( msg, i ) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'jarvis' && (
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user'
                    ? 'bg-yellow-400 text-zinc-950 rounded-br-sm'
                    : 'bg-zinc-800 text-white rounded-bl-sm'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ) )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                🤖
              </div>
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

        {/* Quick prompts */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {[
              'When is the next van?',
              'How many ahead of me?',
              'Which stop has least queue?',
            ].map( ( prompt ) => (
              <button
                key={prompt}
                type="button"
                onClick={() => processMessage( prompt, false )}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-xl transition-colors border border-zinc-700"
              >
                {prompt}
              </button>
            ) )}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-4 pb-6 border-t border-zinc-800">
          <div className="flex gap-2 items-center bg-zinc-800 rounded-2xl px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput( e.target.value )}
              onKeyDown={handleKey}
              placeholder="Ask Jarvis anything..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={sendTextMessage}
              disabled={!input.trim() || isTyping}
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