import { escapeMarkup } from './markup.ts'

/* Privacy-preserving Markdown/HTML -> Pango markup for Quick Look. Pure (no
 * GTK) so tests/ can import it.
 *
 * Policy, by construction rather than by filtering:
 *  - Output is built only from a small block/inline model; no input text or
 *    attribute reaches the markup unescaped, so nothing can inject Pango tags.
 *  - Nothing is ever fetched: images become "[image: alt]" text, <link>,
 *    <style>, <script>, frames, objects and the like are dropped with their
 *    content. Local asset scope is therefore empty — only the previewed file
 *    itself is read.
 *  - Links keep their href only for http(s) and mailto; everything else
 *    (javascript:, data:, file:, relative paths) renders as plain text.
 *    The consumer opens a link only on an explicit click.
 *  - Input and output are bounded; the parsers never throw on malformed input
 *    (callers still fall back to raw text if one does). */

export const MAX_RICH_BYTES = 256 * 1024
export const MAX_BLOCKS = 4000
const MAX_HREF = 2048
const MAX_DEPTH = 8

export interface Span {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
  href?: string
}

export type BlockKind = 'heading' | 'para' | 'item' | 'code' | 'quote' | 'rule'

export interface Block {
  kind: BlockKind
  level?: number
  depth?: number
  marker?: string
  spans: Span[]
}

export interface RichDoc {
  blocks: Block[]
  truncated: boolean
}

export type RichKind = 'markdown' | 'html'

/* Decide how a file is rendered, from its content type and name; null = not rich. */
export function richKind(contentType: string, path: string | null): RichKind | null {
  if (contentType === 'text/html' || contentType === 'application/xhtml+xml') return 'html'
  if (contentType === 'text/markdown' || contentType === 'text/x-markdown') return 'markdown'
  const name = (path ?? '').toLowerCase()
  if (/\.(md|markdown|mdown)$/.test(name)) return 'markdown'
  if (/\.(html?|xhtml)$/.test(name)) return 'html'
  return null
}

/* Only these schemes survive; the rest is shown as plain text. */
export function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const h = href.trim()
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  if (h.length > MAX_HREF || /[\u0000-\u001f\u007f\s]/.test(h)) return undefined
  return /^(https?:\/\/[^/\s]|mailto:[^\s])/i.test(h) ? h : undefined
}

/* ---------- Markdown ---------- */

export function parseMarkdown(src: string): RichDoc {
  const blocks: Block[] = []
  let truncated = false
  const push = (b: Block): boolean => {
    if (blocks.length >= MAX_BLOCKS) {
      truncated = true
      return false
    }
    blocks.push(b)
    return true
  }
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  let para: string[] = []
  const flushPara = () => {
    if (para.length) push({ kind: 'para', spans: parseInline(para.join(' ')) })
    para = []
  }

  for (let i = 0; i < lines.length && !truncated; i++) {
    const line = lines[i]
    const fence = /^\s{0,3}(```|~~~)/.exec(line)
    if (fence) {
      flushPara()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith(fence[1])) code.push(lines[i++])
      push({ kind: 'code', spans: [{ text: code.join('\n'), code: true }] })
      continue
    }
    if (!line.trim()) {
      flushPara()
      continue
    }
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) {
      flushPara()
      push({ kind: 'heading', level: h[1].length, spans: parseInline(h[2]) })
      continue
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushPara()
      push({ kind: 'rule', spans: [] })
      continue
    }
    const li = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line)
    if (li) {
      flushPara()
      const depth = Math.min(MAX_DEPTH, Math.floor(li[1].replace(/\t/g, '    ').length / 2))
      const marker = /\d/.test(li[2]) ? li[2] : '•'
      push({ kind: 'item', depth, marker, spans: parseInline(li[3]) })
      continue
    }
    const q = /^\s{0,3}>\s?(.*)$/.exec(line)
    if (q) {
      flushPara()
      push({ kind: 'quote', spans: parseInline(q[1]) })
      continue
    }
    para.push(line.trim())
  }
  flushPara()
  return { blocks, truncated }
}

const EMPHASIS: [string, Partial<Span>][] = [
  ['**', { bold: true }],
  ['__', { bold: true }],
  ['~~', { strike: true }],
  ['*', { italic: true }],
  ['_', { italic: true }],
]

/* Inline Markdown: `code`, bold, italic, strike (star/underscore/tilde pairs), [t](url),
 * ![alt](url), <autolink>. Unmatched delimiters stay literal. */
export function parseInline(src: string, depth = 0): Span[] {
  const out: Span[] = []
  let buf = ''
  const flush = () => {
    if (buf) {
      out.push({ text: buf })
      buf = ''
    }
  }
  const wrap = (inner: string, extra: Partial<Span>) => {
    flush()
    const spans = depth < MAX_DEPTH ? parseInline(inner, depth + 1) : [{ text: inner }]
    for (const s of spans)
      out.push({ ...s, ...extra, bold: extra.bold || s.bold, italic: extra.italic || s.italic })
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '\\' && i + 1 < src.length && /[\\`*_{}\[\]()#+\-.!~<>]/.test(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1)
      if (end > i + 1) {
        flush()
        out.push({ text: src.slice(i + 1, end), code: true })
        i = end + 1
        continue
      }
    }
    if (c === '!' && src[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(src.slice(i))
      if (m) {
        buf += `[image: ${m[1] || 'no description'}]`
        i += m[0].length
        continue
      }
    }
    if (c === '[') {
      const m = /^\[([^\]]+)\]\(\s*([^)\s]*)(?:\s+"[^"]*")?\s*\)/.exec(src.slice(i))
      if (m) {
        wrap(m[1], { href: safeHref(m[2]) })
        i += m[0].length
        continue
      }
    }
    if (c === '<') {
      const m = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/i.exec(src.slice(i))
      if (m) {
        flush()
        out.push({ text: m[1], href: safeHref(m[1]) })
        i += m[0].length
        continue
      }
    }
    let matched = false
    for (const [delim, extra] of EMPHASIS) {
      if (!src.startsWith(delim, i)) continue
      const end = src.indexOf(delim, i + delim.length)
      if (end > i + delim.length && !/^\s/.test(src[i + delim.length])) {
        wrap(src.slice(i + delim.length, end), extra)
        i = end + delim.length
        matched = true
        break
      }
    }
    if (matched) continue
    buf += c
    i++
  }
  flush()
  return out
}

/* ---------- HTML ---------- */

/* Elements removed together with everything inside them. */
const DROP = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'template',
  'noscript',
  'head',
  'title',
  'svg',
  'math',
  'canvas',
  'audio',
  'video',
  'source',
  'track',
  'form',
  'select',
  'textarea',
  'button',
  'input',
  'link',
  'meta',
  'base',
])
/* Void elements: dropped without swallowing what follows. */
const VOID = new Set(['source', 'track', 'embed', 'input', 'link', 'meta', 'base'])
const BLOCK = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  'figure',
  'figcaption',
  'table',
  'tr',
  'dl',
  'dt',
  'dd',
  'details',
  'summary',
  'address',
  'body',
  'html',
])
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp =
        e[1].toLowerCase() === 'x'
          ? Number.parseInt(e.slice(2), 16)
          : Number.parseInt(e.slice(1), 10)
      return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)
        ? String.fromCodePoint(cp)
        : ''
    }
    return NAMED[e.toLowerCase()] ?? m
  })
}

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(
    attrs,
  )
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? '') : undefined
}

export function parseHtml(src: string): RichDoc {
  const blocks: Block[] = []
  let truncated = false
  let spans: Span[] = []
  let kind: BlockKind = 'para'
  let level: number | undefined
  let pre = 0
  let bold = 0
  let italic = 0
  let code = 0
  let strike = 0
  let quote = 0
  const hrefs: (string | undefined)[] = []
  const lists: { ordered: boolean; n: number }[] = []
  let pendingItem: { depth: number; marker: string } | null = null

  const flush = () => {
    while (spans.length && !pre && spans[spans.length - 1].text.trim() === '') spans.pop()
    if (spans.length && !pre) spans[spans.length - 1].text = spans[spans.length - 1].text.trimEnd()
    if (spans.length || kind === 'rule') {
      if (blocks.length >= MAX_BLOCKS) truncated = true
      else {
        const b: Block = { kind, spans }
        if (level) b.level = level
        if (pendingItem) {
          b.kind = 'item'
          b.depth = pendingItem.depth
          b.marker = pendingItem.marker
        } else if (kind === 'para' && quote) b.kind = 'quote'
        blocks.push(b)
      }
    }
    spans = []
    kind = 'para'
    level = undefined
    pendingItem = null
  }
  const text = (raw: string) => {
    let t = raw
    if (!t) return
    if (!pre) {
      t = t.replace(/\s+/g, ' ')
      const prev = spans[spans.length - 1]
      if (!prev || prev.text.endsWith(' ')) t = t.replace(/^ /, '')
      if (!t) return
    }
    spans.push({
      text: t,
      bold: bold > 0 || undefined,
      italic: italic > 0 || undefined,
      code: code > 0 || pre > 0 || undefined,
      strike: strike > 0 || undefined,
      href: hrefs.length ? hrefs[hrefs.length - 1] : undefined,
    })
  }

  const tag =
    /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>?|<[!?][^>]*>?/g
  let last = 0
  const lower = src.toLowerCase()
  for (const m of src.matchAll(tag)) {
    if (truncated) break
    if (m.index < last) continue
    text(decodeEntities(src.slice(last, m.index)))
    last = m.index + m[0].length
    if (!m[2]) continue
    const name = m[2].toLowerCase()
    const closing = m[1] === '/'
    const attrs = m[3] ?? ''
    if (DROP.has(name)) {
      if (!closing && !VOID.has(name)) {
        const end = lower.indexOf(`</${name}`, last)
        if (end < 0) {
          last = src.length
          break
        }
        const gt = src.indexOf('>', end)
        last = gt < 0 ? src.length : gt + 1
      }
      continue
    }
    if (/^h[1-6]$/.test(name)) {
      flush()
      if (!closing) {
        kind = 'heading'
        level = Number(name[1])
      }
    } else if (name === 'br') {
      text('\n')
    } else if (name === 'hr') {
      flush()
      kind = 'rule'
      flush()
    } else if (name === 'pre') {
      flush()
      pre += closing ? (pre ? -1 : 0) : 1
      if (!closing) kind = 'code'
    } else if (name === 'ul' || name === 'ol') {
      flush()
      if (closing) lists.pop()
      else if (lists.length < MAX_DEPTH) lists.push({ ordered: name === 'ol', n: 0 })
    } else if (name === 'li') {
      flush()
      if (!closing) {
        const l = lists[lists.length - 1]
        if (l) l.n++
        pendingItem = { depth: Math.max(0, lists.length - 1), marker: l?.ordered ? `${l.n}.` : '•' }
      }
    } else if (name === 'blockquote') {
      flush()
      quote = Math.max(0, quote + (closing ? -1 : 1))
    } else if (BLOCK.has(name)) flush()
    else if (name === 'b' || name === 'strong') bold = Math.max(0, bold + (closing ? -1 : 1))
    else if (name === 'i' || name === 'em' || name === 'cite')
      italic = Math.max(0, italic + (closing ? -1 : 1))
    else if (name === 'code' || name === 'kbd' || name === 'samp' || name === 'tt')
      code = Math.max(0, code + (closing ? -1 : 1))
    else if (name === 's' || name === 'del' || name === 'strike')
      strike = Math.max(0, strike + (closing ? -1 : 1))
    else if (name === 'a') {
      if (closing) hrefs.pop()
      else hrefs.push(safeHref(attr(attrs, 'href')))
    } else if (name === 'img' && !closing) {
      text(`[image: ${attr(attrs, 'alt') || 'no description'}]`)
    }
  }
  if (!truncated) text(decodeEntities(src.slice(last).replace(/<[^>]*$/, '')))
  flush()
  return { blocks, truncated }
}

/* ---------- Pango output ---------- */

const HEADING_SIZE = ['xx-large', 'x-large', 'large', 'large', 'medium', 'medium']

/* Drop control characters Pango rejects; keep \n and \t. */
function clean(t: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  return t.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
}

function spanMarkup(s: Span): string {
  let out = escapeMarkup(clean(s.text))
  if (!out) return ''
  if (s.code) out = `<tt>${out}</tt>`
  if (s.strike) out = `<s>${out}</s>`
  if (s.italic) out = `<i>${out}</i>`
  if (s.bold) out = `<b>${out}</b>`
  if (s.href) out = `<a href="${escapeMarkup(s.href)}">${out}</a>`
  return out
}

export function toPango(doc: RichDoc): string {
  const parts: string[] = []
  for (const b of doc.blocks) {
    const inner = b.spans.map(spanMarkup).join('')
    switch (b.kind) {
      case 'heading': {
        const size = HEADING_SIZE[(b.level ?? 1) - 1] ?? 'medium'
        parts.push(`<span size="${size}" weight="bold">${inner}</span>`)
        break
      }
      case 'item':
        parts.push(`${'    '.repeat(b.depth ?? 0)}${escapeMarkup(b.marker ?? '•')} ${inner}`)
        break
      case 'quote':
        parts.push(`<span alpha="75%">▎ ${inner}</span>`)
        break
      case 'rule':
        parts.push('────────────────')
        break
      default:
        parts.push(inner)
    }
  }
  return parts.join('\n\n').replace(/\n\n(?=(?:\s*(?:•|\d+\.) ))/g, '\n')
}

export function renderRich(kind: RichKind, src: string): { markup: string; truncated: boolean } {
  const doc = kind === 'markdown' ? parseMarkdown(src) : parseHtml(src)
  return { markup: toPango(doc), truncated: doc.truncated }
}
