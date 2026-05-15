import { useState, useRef, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

interface Message {
  role: "user" | "jarvis";
  text: string;
}

interface JarvisPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

async function sendToJarvis(
  message: string,
  history: Message[],
  token: string,
): Promise<string> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/jarvis/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      history: history.map((m) => ({
        role: m.role === "jarvis" ? "assistant" : "user",
        content: m.text,
      })),
    }),
  });
  if (!res.ok) return "Sorry, I'm having trouble connecting right now.";
  const data = await res.json();
  return data.reply ?? "Sorry, I couldn't process that.";
}

export default function JarvisPanel({ isOpen, onClose }: JarvisPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "jarvis",
      text: "Hi! I'm Jarvis 👋 Ask me about van ETAs, queue positions, or campus directions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", text: userMsg },
    ];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";
      const reply = await sendToJarvis(userMsg, messages, token);
      setMessages([...updatedMessages, { role: "jarvis", text: reply }]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "jarvis", text: "Sorry, I'm unavailable right now." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Jarvis panel"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
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
              <p className="text-zinc-500 text-xs">
                AI Campus Assistant • Powered by Llama 3.1
              </p>
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
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "jarvis" && (
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-yellow-400 text-zinc-950 rounded-br-sm"
                    : "bg-zinc-800 text-white rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                🤖
              </div>
              <div className="bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span
                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
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
              "When is the next van?",
              "How many ahead of me?",
              "Which stop has least queue?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInput(prompt);
                }}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-xl transition-colors border border-zinc-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-4 pb-6 border-t border-zinc-800">
          <div className="flex gap-2 items-center bg-zinc-800 rounded-2xl px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Jarvis anything..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={sendMessage}
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
  );
}
