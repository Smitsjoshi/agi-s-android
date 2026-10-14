import { useCallback, useRef, useState } from 'react'

import { apiUrl, getToken } from '@/lib/api'
import { streamSse, type StreamHandle } from '@/lib/sse'

/**
 * The conversation, and the streaming that makes it feel alive.
 *
 * ## Why tokens are batched instead of rendered as they arrive
 *
 * The obvious loop — receive a token, call setState, let React render — is also
 * the reason most chat apps stutter. A fast lane emits tokens faster than a
 * phone can lay out text, so each one queues a render, every render re-measures
 * a growing block of markdown, and the main thread falls behind the stream. The
 * text appears in lurches, scrolling fights the user, and the device gets warm.
 *
 * So tokens accumulate in a ref — which does not trigger a render — and are
 * flushed on a timer. Sixteen milliseconds is one frame at 60fps: fast enough
 * that it reads as continuous typing, and slow enough that the renderer is never
 * asked for more than the screen can show.
 *
 * The ref matters as much as the timer. Appending to state inside a fast loop
 * also means reading stale state, so a dropped token is a real possibility and
 * an invisible one — the answer is simply missing a word.
 */

export type Role = 'user' | 'assistant'

export type Message = {
  id: string
  role: Role
  text: string
  /** True while this message is still arriving. */
  streaming?: boolean
  error?: string
  sources?: { title: string; url: string }[]
}

/** What the model is doing right now, in words, while nothing is on screen yet. */
export type Stage = string | null

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** One frame at 60fps. See the note above on why this exists at all. */
const FLUSH_MS = 16

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [stage, setStage] = useState<Stage>(null)
  const [followups, setFollowups] = useState<string[]>([])

  const pending = useRef('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const handle = useRef<StreamHandle | null>(null)
  const assistantId = useRef<string | null>(null)

  const patch = useCallback((id: string, change: Partial<Message>) => {
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...change } : m)))
  }, [])

  /** Move whatever has accumulated into the message being rendered. */
  const flush = useCallback(() => {
    const id = assistantId.current
    if (!id || !pending.current) return
    const chunk = pending.current
    pending.current = ''
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, text: m.text + chunk } : m)))
  }, [])

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const stop = useCallback(() => {
    handle.current?.cancel()
    handle.current = null
    stopTimer()
    flush()
    if (assistantId.current) patch(assistantId.current, { streaming: false })
    assistantId.current = null
    setStreaming(false)
    setStage(null)
  }, [flush, patch, stopTimer])

  const send = useCallback(
    async (text: string, options?: { depthId?: string; personaId?: string; modelId?: string }) => {
      const body = text.trim()
      if (!body || streaming) return

      setFollowups([])
      const userMessage: Message = { id: newId(), role: 'user', text: body }
      const reply: Message = { id: newId(), role: 'assistant', text: '', streaming: true }
      assistantId.current = reply.id

      // Captured before the state update so the request carries this turn too —
      // reading `messages` after setState would send the previous turn's history.
      const history = [...messages, userMessage].map((m) => ({ role: m.role, content: m.text }))

      setMessages((list) => [...list, userMessage, reply])
      setStreaming(true)
      setStage('Thinking')

      stopTimer()
      timer.current = setInterval(flush, FLUSH_MS)

      const token = await getToken()

      handle.current = streamSse({
        url: apiUrl('/api/chat/stream'),
        token,
        body: {
          messages: history,
          modelId: options?.modelId,
          personaId: options?.personaId,
          depthId: options?.depthId,
        },
        onEvent: ({ event, data }) => {
          const payload = data as Record<string, unknown>
          switch (event) {
            case 'token':
              // Straight into the buffer. The timer decides when it is drawn.
              pending.current += String(payload?.token ?? '')
              break
            case 'stage':
              setStage(String(payload?.label ?? '') || null)
              break
            case 'searching':
              setStage('Searching the web')
              break
            case 'sources':
              if (Array.isArray(payload?.sources)) {
                patch(reply.id, { sources: payload.sources as Message['sources'] })
              }
              break
            case 'followups':
              if (Array.isArray(payload?.followups)) {
                setFollowups((payload.followups as unknown[]).map(String).slice(0, 4))
              }
              break
            case 'revised':
            case 'complete':
              // A revision replaces the answer wholesale rather than editing it
              // live under the reader. Anything still buffered is dropped on
              // purpose — it is the superseded text.
              if (typeof payload?.text === 'string') {
                pending.current = ''
                patch(reply.id, { text: payload.text })
              }
              break
            case 'error':
              patch(reply.id, { error: String(payload?.error ?? 'Something went wrong.') })
              break
          }
        },
        onError: (message) => patch(reply.id, { error: message }),
        onDone: () => {
          stopTimer()
          flush()
          patch(reply.id, { streaming: false })
          assistantId.current = null
          handle.current = null
          setStreaming(false)
          setStage(null)
        },
      })
    },
    [messages, streaming, flush, patch, stopTimer],
  )

  const reset = useCallback(() => {
    stop()
    setMessages([])
    setFollowups([])
  }, [stop])

  return { messages, streaming, stage, followups, send, stop, reset }
}
