/**
 * The SSE parser, against the ways a stream actually breaks.
 *
 * Build first:
 *   npx esbuild src/lib/sse.ts --format=esm --outfile=test/.build/sse.mjs
 *   node test/sse.mjs
 *
 * Every case here produces a subtly WRONG answer rather than an error, which is
 * why they are worth tests: a dropped word, a doubled space, a heartbeat
 * rendered as text. None of them throws, so none of them shows up in a log.
 */
import { parseChunk } from './.build/sse.mjs'

let pass = 0, fail = 0
const ok = (n, c, d = '') => c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FAIL  ' + n + '  ' + d))

// A whole event.
let r = parseChunk('event: token\ndata: {"token":"Hello"}\n\n')
ok('one complete event', r.events.length === 1 && r.events[0].data.token === 'Hello', JSON.stringify(r))
ok('  ...consumes the buffer', r.rest === '')

// Two events in one chunk — common once tokens arrive quickly.
r = parseChunk('event: token\ndata: {"token":"a"}\n\nevent: token\ndata: {"token":"b"}\n\n')
ok('two events in one chunk', r.events.length === 2 && r.events[1].data.token === 'b')

// THE one that drops words: an event split across a chunk boundary.
r = parseChunk('event: token\ndata: {"tok')
ok('a partial event yields nothing yet', r.events.length === 0)
ok('  ...and is kept for the next chunk', r.rest === 'event: token\ndata: {"tok')
const r2 = parseChunk(r.rest + 'en":"world"}\n\n')
ok('  ...then completes intact', r2.events.length === 1 && r2.events[0].data.token === 'world', JSON.stringify(r2))

// The heartbeat the server sends every 15s to stop proxies closing the socket.
r = parseChunk(': ping\n\nevent: token\ndata: {"token":"x"}\n\n')
ok('a heartbeat is ignored, not rendered', r.events.length === 1 && r.events[0].data.token === 'x', JSON.stringify(r.events))

// Leading space after `data:` is a separator, not content — indentation in
// streamed code depends on getting this exactly right.
r = parseChunk('event: token\ndata: {"token":"    indented"}\n\n')
ok('only ONE leading space is stripped', r.events[0].data.token === '    indented', JSON.stringify(r.events[0]))

// Windows line endings, which some proxies rewrite to.
r = parseChunk('event: token\r\ndata: {"token":"crlf"}\r\n\r\n')
ok('CRLF line endings parse', r.events.length === 1 && r.events[0].data.token === 'crlf', JSON.stringify(r))

// Every event name the server actually sends.
const names = ['start','token','stage','searching','sources','followups','depth','revised','complete','error']
r = parseChunk(names.map((n) => `event: ${n}\ndata: {}\n\n`).join(''))
ok('all 10 server event names survive', r.events.map((e) => e.event).join(',') === names.join(','), r.events.map(e=>e.event).join(','))

// A non-JSON payload must not kill the stream.
r = parseChunk('event: token\ndata: not json\n\n')
ok('a non-JSON payload passes through as text', r.events.length === 1 && r.events[0].data === 'not json')

// Multi-line data joins with newlines, per the spec.
r = parseChunk('event: complete\ndata: line one\ndata: line two\n\n')
ok('multi-line data joins with a newline', r.events[0].data === 'line one\nline two', JSON.stringify(r.events[0]))

// A realistic answer arriving one character at a time.
const wire = 'event: token\ndata: {"token":"The "}\n\nevent: token\ndata: {"token":"answer."}\n\nevent: complete\ndata: {"text":"The answer."}\n\n'
let buf = '', got = ''
for (const ch of wire) {
  const step = parseChunk(buf + ch)
  buf = step.rest
  for (const e of step.events) if (e.event === 'token') got += e.data.token
}
ok('byte-by-byte delivery reassembles exactly', got === 'The answer.', JSON.stringify(got))

console.log(fail ? `\n  FAILURES — ${pass} passed, ${fail} failed\n` : `\n  ALL PASS — ${pass} passed, 0 failed\n`)
process.exit(fail ? 1 : 0)
