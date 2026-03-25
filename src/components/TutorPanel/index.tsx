'use client'
import React, { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle, Lock } from 'lucide-react'
import { cn } from '@/utilities/ui'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export const TutorPanel: React.FC<{
  open: boolean
  onClose: () => void
  contextType: string
  contextId: string
  contextTitle: string
}> = ({ open, onClose, contextType, contextId, contextTitle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setError(null)

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          contextType,
          contextId,
        }),
      })

      if (res.status === 401) {
        setError('Please sign in to use the AI Tutor.')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setError('You do not have access to the AI Tutor. Upgrade your plan for access.')
        setLoading(false)
        return
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => null)
        const isZeroLimit = data?.limit === 0
        setError(
          isZeroLimit
            ? 'AI Tutor is not available on your current plan. Upgrade for access.'
            : 'Daily tutor limit reached. Upgrade your plan for more access.',
        )
        setLoading(false)
        return
      }

      if (res.status === 503) {
        setError('AI features are temporarily unavailable.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Stream SSE response
      const reader = res.body?.getReader()
      if (!reader) return

      let assistantContent = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantContent += parsed.text
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-background border-l border-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">AI Tutor</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">{contextTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground pt-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>Ask me anything about this content.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-muted rounded-lg p-3 ml-8'
                  : 'pr-8',
              )}
            >
              {msg.content || (loading && i === messages.length - 1 && (
                <span className="inline-block w-2 h-4 bg-amber-500/50 animate-pulse" />
              ))}
            </div>
          ))}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/5 rounded-lg p-3">{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-500/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                'p-2 rounded-lg transition-colors',
                input.trim() ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'text-muted-foreground',
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
