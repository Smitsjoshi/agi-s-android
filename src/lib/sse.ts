/**
 * Server-sent events, parsed by hand.
 *
 * ## Why this is not `fetch`
 *
 * React Native's `fetch` does not give you a streaming response body. There is
 * no `response.body.getReader()`, so the web app's entire streaming path — read
 * a chunk, decode it, split on newlines — has nothing to read from. Awaiting
 * `response.text()` works and arrives all at once, which turns a thirty-second
 * answer into thirty seconds of a spinner and then a wall of text. That is the
 * single difference between an AI app that feels alive and one that feels
 * broken, so it is the first thing built and the first thing tested.
 *
 * `XMLHttpRequest` is the way out. It is old, it is in every React Native
 * runtime, and its `readyState === 3` fires repeatedly while the body is still
 * arriving, with everything received so far in `responseText`. Tracking how much
 * has already been consumed turns that into a stream.
 *
 * ## Why the parser is separate from the transport
 *
 * Everything below `parseChunk` is pure: bytes in, events out, no network and no
 * React Native. That means it can be tested properly in Node — and the parts of
 * streaming that actually break are parsing problems, not network ones. An event
 * split across two chunks, a `data:` line containing a JSON string with a
 * newline in it, a heartbeat comment arriving mid-answer: each produces a
 * subtly wrong answer rather than an error, and each has a test.
 */

export type SseEvent = { event: string; data: unknown }

/**
 * Pull complete events out of a buffer, leaving any partial tail behind.
 *
 * Returns the events found and the unconsumed remainder, which the caller keeps
 * for next time. A chunk boundary falls wherever TCP decides, so assuming a
 * chunk contains whole events is the most common way a streaming client drops
 * the last word of every few messages.
 */
export function parseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []

  // Events are separated by a blank line. Anything after the final separator is
  // incomplete by definition.
  const boundary = /\r?\n\r?\n/
  let rest = buffer

  while (true) {
    const match = boundary.exec(rest)
    if (!match) break

    const frame = rest.slice(0, match.index)
    rest = rest.slice(match.index + match[0].length)

    let event = 'message'
    const dataLines: string[] = []

    for (const line of frame.split(/\r?\n/)) {
      // A line beginning with a colon is a comment. The server sends `: ping`
      // every fifteen seconds to stop proxies closing an idle connection, and
      // a parser that treats it as data corrupts the stream.
      if (line.startsWith(':')) continue
      if (line.startsWith('event:')) event = line.slice(6).trim()
      // Exactly one space after the colon is stripped, per the spec. Stripping
      // all leading whitespace would eat the indentation of streamed code.
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
    }

    if (!dataLines.length) continue

    // Multiple data lines in one frame are joined with newlines — that is how a
    // multi-line payload is transmitted.
    const raw = dataLines.join('\n')
    try {
      events.push({ event, data: JSON.parse(raw) })
    } catch {
      // Not JSON. Pass the text through rather than dropping the event: the
      // caller knows what each event name should carry.
      events.push({ event, data: raw })
    }
  }

  return { events, rest }
}

export type StreamHandle = { cancel: () => void }

export type StreamOptions = {
  url: string
  body: unknown
  token?: string | null
  onEvent: (event: SseEvent) => void
  onError: (message: string) => void
  onDone: () => void
}

/**
 * POST a JSON body and read the SSE response as it arrives.
 *
 * `onDone` fires exactly once, whatever happens — completion, failure or
 * cancellation — because every caller has a "stop the typing indicator" step
 * and a path that silently skips it leaves the UI spinning forever.
 */
export function streamSse({ url, body, token, onEvent, onError, onDone }: StreamOptions): StreamHandle {
  const request = new XMLHttpRequest()
  let consumed = 0
  let buffer = ''
  let finished = false

  const finish = (message?: string) => {
    if (finished) return
    finished = true
    if (message) onError(message)
    onDone()
  }

  request.open('POST', url, true)
  request.setRequestHeader('Content-Type', 'application/json')
  request.setRequestHeader('Accept', 'text/event-stream')
  if (token) request.setRequestHeader('Authorization', `Bearer ${token}`)

  request.onreadystatechange = () => {
    // 3 = LOADING. Fires repeatedly while the body arrives; `responseText` holds
    // everything received so far, so only the new tail is ours to process.
    if (request.readyState === 3 || request.readyState === 4) {
      const text = request.responseText
      if (text.length > consumed) {
        buffer += text.slice(consumed)
        consumed = text.length
        const { events, rest } = parseChunk(buffer)
        buffer = rest
        for (const event of events) onEvent(event)
      }
    }

    if (request.readyState === 4) {
      if (request.status === 0) {
        // Status 0 after a cancel is normal and must not be reported as a fault.
        finish(finished ? undefined : 'The connection dropped.')
      } else if (request.status >= 400) {
        let message = `The server answered ${request.status}.`
        try {
          const parsed = JSON.parse(request.responseText)
          if (parsed?.error) message = String(parsed.error)
        } catch {
          /* Not JSON; the status line is all there is to say. */
        }
        finish(message)
      } else {
        finish()
      }
    }
  }

  request.onerror = () => finish('Could not reach AGI-S.')
  request.ontimeout = () => finish('The request timed out.')

  /**
   * No timeout, deliberately.
   *
   * A Maximum-depth answer searches, recalls, generates, audits and revises, and
   * routinely runs past a minute. XHR's default is no timeout; setting one
   * "just in case" is how long answers get cut, which is the exact bug this
   * product already fixed once on the server side.
   */
  request.send(JSON.stringify(body))

  return {
    cancel: () => {
      finished = true
      request.abort()
      onDone()
    },
  }
}
