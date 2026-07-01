import Gtk from 'gi:Gtk-4.0'
import Pango from 'gi:Pango-1.0'
import PangoCairo from 'gi:PangoCairo-1.0'
import { formatBytes } from '../core/format.ts'
import type { UsageNode } from '../core/disk-usage.ts'

const TAU = Math.PI * 2
const TOP = -Math.PI / 2          // 12 o'clock; wedges sweep clockwise from here
const RINGS = 5                    // rings drawn outward (= Baobab MAX_DEPTH)
const MIN_SWEEP = 0.012            // skip slivers smaller than this (radians)

/* GNOME Disk Usage Analyzer's exact chart palette (baobab-chart.vala
 * `chart_colors`), interpolated by a wedge's angular position and darkened with
 * depth — see `wedgeColour`. */
const PALETTE: Array<[number, number, number]> = [
  [0xe0, 0x1b, 0x24], [0xff, 0x78, 0x00], [0xf6, 0xd3, 0x2d],
  [0x33, 0xd1, 0x7a], [0x35, 0x84, 0xe4], [0x91, 0x41, 0xac],
].map(([r, g, b]) => [r / 255, g / 255, b / 255])
const COLOR_SEG = 100 / 3          // Baobab spreads the palette over three thirds

interface Segment {
  node: UsageNode
  depth: number                    // 1 = innermost ring
  a0: number; a1: number           // angular span (radians)
  inner: number; outer: number     // radii
  parent: number                   // index of the segment one ring in, or -1
  rel: number                      // start position around the circle, 0..100
}

/* A Baobab-style rings chart (GNOME Disk Usage Analyzer): the scanned folder is
 * the centre disc; each ring out is one level of the tree, every node a wedge
 * sized by its share of its parent. Colours are Baobab's own palette interpolated
 * by the wedge's angular position, darkened per depth; hovering brightens a wedge
 * and its lineage to the centre and shows a name/size tooltip; clicking a folder
 * wedge drills in. Layout is recomputed each draw, so it reflows on resize. */
export class SunburstView {
  widget: any
  root: UsageNode | null = null
  segments: Segment[] = []
  _hover = -1
  _cx = 0; _cy = 0; _centre = 0; _thickness = 0
  onActivate: (node: UsageNode) => void = () => {}
  onHover: (node: UsageNode | null) => void = () => {}

  constructor() {
    this.widget = new Gtk.DrawingArea({ hexpand: true, vexpand: true })
    this.widget.setDrawFunc((...a: any[]) => this._draw(a[1], a[2], a[3]))
    this.widget.setHasTooltip(true)
    this.widget.on('query-tooltip', (...a: any[]) => this._onQueryTooltip(a[0], a[1], a[3]))

    const motion = new Gtk.EventControllerMotion()
    motion.on('motion', (...a: any[]) => { const [x, y] = a.slice(-2); this._setHover(this._hit(x, y)) })
    motion.on('leave', () => this._setHover(-1))
    this.widget.addController(motion)

    const click = new Gtk.GestureClick({ button: 1 })
    click.on('released', (...a: any[]) => { const [x, y] = a.slice(-2); this._click(x, y) })
    this.widget.addController(click)
  }

  setRoot(root: UsageNode | null): void { this.root = root; this.widget.queueDraw() }

  /* ---- layout ---- */
  _layout(w: number, h: number): void {
    this.segments = []
    this._cx = w / 2; this._cy = h / 2
    const maxR = Math.min(w, h) / 2 - 8
    this._centre = Math.max(24, maxR * 0.22)
    this._thickness = (maxR - this._centre) / RINGS
    if (this.root && this.root.bytes > 0) this._build(this.root, 0, TOP, TOP + TAU, -1)
  }

  _build(node: UsageNode, depth: number, a0: number, a1: number, parent: number): void {
    let self = parent
    if (depth >= 1) {
      const inner = this._centre + (depth - 1) * this._thickness
      self = this.segments.length
      this.segments.push({ node, depth, a0, a1, inner, outer: inner + this._thickness, parent, rel: ((a0 - TOP) % TAU + TAU) % TAU / TAU * 100 })
    }
    if (depth >= RINGS || !node.children || node.bytes <= 0) return
    let a = a0
    const span = a1 - a0
    for (const child of node.children) {
      if (child.bytes <= 0) continue
      const sweep = span * (child.bytes / node.bytes)
      if (sweep >= MIN_SWEEP) this._build(child, depth + 1, a, a + sweep, self)
      a += sweep
    }
  }

  /* ---- interaction ---- */
  _hit(x: number, y: number): number {
    const dx = x - this._cx, dy = y - this._cy
    const r = Math.hypot(dx, dy)
    if (r < this._centre) return -1
    const ang = Math.atan2(dy, dx)
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i]
      if (r >= s.inner && r < s.outer && arcContains(ang, s.a0, s.a1)) return i
    }
    return -1
  }

  _setHover(i: number): void {
    if (i === this._hover) return
    this._hover = i
    this.onHover(i >= 0 ? this.segments[i].node : null)
    this.widget.queueDraw()
  }

  _click(x: number, y: number): void {
    const i = this._hit(x, y)
    if (i >= 0 && this.segments[i].node.isDir) this.onActivate(this.segments[i].node)
  }

  _onQueryTooltip(x: number, y: number, tooltip: any): boolean {
    const i = this._hit(x, y)
    if (i < 0) return false
    const node = this.segments[i].node
    const total = this.root?.bytes || 0
    const pct = total > 0 ? ` · ${Math.round((node.bytes / total) * 100)}%` : ''
    tooltip.setMarkup(`<b>${escapeMarkup(node.name)}</b>\n${formatBytes(node.bytes)}${pct}`)
    return true
  }

  /* Whether a segment is the hovered one or an ancestor of it (its lineage). */
  _inLineage(i: number): boolean {
    if (this._hover < 0) return false
    for (let j = this._hover; j >= 0; j = this.segments[j].parent) if (j === i) return true
    return false
  }

  /* ---- drawing ---- */
  _draw(cr: any, w: number, h: number): void {
    this._layout(w, h)
    for (let i = 0; i < this.segments.length; i++) this._drawSegment(cr, this.segments[i], i)
    /* Centre disc (the scanned folder). */
    const fg = this.widget.getColor()
    cr.arc(this._cx, this._cy, this._centre, 0, TAU)
    cr.setSourceRgba(fg.red, fg.green, fg.blue, 0.10); cr.fill()
    cr.arc(this._cx, this._cy, this._centre, 0, TAU)
    cr.setSourceRgba(fg.red, fg.green, fg.blue, 0.25); cr.setLineWidth(1); cr.stroke()
    /* Names last, on top of every wedge, only where they fully fit (Baobab). */
    for (const s of this.segments) this._drawLabel(cr, s)
  }

  _drawSegment(cr: any, s: Segment, i: number): void {
    const [r, g, b] = wedgeColour(s.rel, s.depth, this._inLineage(i))
    cr.newPath()
    cr.arc(this._cx, this._cy, s.outer, s.a0, s.a1)
    cr.arcNegative(this._cx, this._cy, s.inner, s.a1, s.a0)
    cr.closePath()
    cr.setSourceRgb(r, g, b); cr.fillPreserve()
    cr.setSourceRgba(0, 0, 0, 0.28); cr.setLineWidth(1); cr.stroke()
  }

  /* Draw a wedge's name tangentially (rotated to follow the ring, flipped to stay
   * upright), but only when the whole name fits the wedge — so only the big ones
   * get labelled, matching Baobab. */
  _drawLabel(cr: any, s: Segment): void {
    const mid = (s.inner + s.outer) / 2
    const arc = (s.a1 - s.a0) * mid
    const band = s.outer - s.inner
    if (arc < 34 || band < 13) return                 // too small to bother measuring

    const layout = PangoCairo.createLayout(cr)
    layout.setFontDescription(Pango.FontDescription.fromString('Sans 9'))
    layout.setText(s.node.name, -1)
    const [pw, ph] = layout.getPixelSize()
    if (pw > arc - 10 || ph > band - 4) return          // require a full fit

    const m = (s.a0 + s.a1) / 2
    let a = m + Math.PI / 2                               // tangent to the ring
    a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI       // normalise to (-π, π]
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI // keep text upright

    const [r, g, b] = wedgeColour(s.rel, s.depth, false)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    cr.save()
    cr.translate(this._cx + Math.cos(m) * mid, this._cy + Math.sin(m) * mid)
    cr.rotate(a)
    if (lum > 0.6) cr.setSourceRgba(0, 0, 0, 0.82)
    else cr.setSourceRgba(1, 1, 1, 0.95)
    cr.moveTo(-pw / 2, -ph / 2)
    PangoCairo.showLayout(cr, layout)
    cr.restore()
  }
}

/* Baobab's `get_item_color`: interpolate the palette by angular position
 * (`rel` 0..100), darken by depth, and — when highlighted — normalise to full
 * brightness (divide by the max channel). */
function wedgeColour(rel: number, depth: number, highlighted: boolean): [number, number, number] {
  const cn = Math.min(5, Math.floor(rel / COLOR_SEG))
  const A = PALETTE[cn], B = PALETTE[(cn + 1) % PALETTE.length]
  const f = (rel - cn * COLOR_SEG) / COLOR_SEG
  let r = A[0] - (A[0] - B[0]) * f
  let g = A[1] - (A[1] - B[1]) * f
  let b = A[2] - (A[2] - B[2]) * f
  const intensity = 1 - ((depth - 1) * 0.3) / RINGS
  r *= intensity; g *= intensity; b *= intensity
  if (highlighted) { const mx = Math.max(r, g, b, 1e-4); r /= mx; g /= mx; b /= mx }
  return [r, g, b]
}

/* Whether angle `a` (any range) lies within the clockwise arc [a0, a1]. */
function arcContains(a: number, a0: number, a1: number): boolean {
  const len = ((a1 - a0) % TAU + TAU) % TAU
  if (len >= TAU - 1e-6) return true
  const d = ((a - a0) % TAU + TAU) % TAU
  return d <= len
}

function escapeMarkup(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
