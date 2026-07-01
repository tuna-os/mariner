import Gtk from 'gi:Gtk-4.0'
import type { UsageNode } from '../core/disk-usage.ts'

const TAU = Math.PI * 2
const TOP = -Math.PI / 2          // 12 o'clock; wedges sweep clockwise from here
const RINGS = 5                    // rings drawn outward from the centre disc
const MIN_SWEEP = 0.012            // skip slivers smaller than this (radians)

interface Segment {
  node: UsageNode
  depth: number                    // 1 = innermost ring
  a0: number; a1: number           // angular span (radians)
  inner: number; outer: number     // radii
  parent: number                   // index of the segment one ring in, or -1
  hue: number
}

/* A Baobab-style rings chart (GNOME Disk Usage Analyzer): the scanned folder is
 * the centre disc; each ring out is one level of the tree, every node a wedge
 * sized by its share of its parent. Colour follows the wedge's angle (so a
 * subtree forms a hue family) and pales with depth. Hovering highlights a wedge
 * and its lineage to the centre; clicking a folder wedge drills in. Layout is
 * recomputed each draw from the allocation, so it reflows on resize. */
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
      const mid = (a0 + a1) / 2
      self = this.segments.length
      this.segments.push({ node, depth, a0, a1, inner, outer: inner + this._thickness, parent, hue: ((mid - TOP) % TAU + TAU) % TAU / TAU * 360 })
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
  }

  _drawSegment(cr: any, s: Segment, i: number): void {
    let sat = clamp(0.55 - (s.depth - 1) * 0.07, 0.16, 0.55)
    let val = clamp(0.80 + (s.depth - 1) * 0.035, 0.80, 0.95)
    if (this._inLineage(i)) { sat = clamp(sat + 0.12, 0, 1); val = clamp(val + 0.08, 0, 1) }
    const [r, g, b] = hsv(s.hue, sat, val)

    cr.newPath()
    cr.arc(this._cx, this._cy, s.outer, s.a0, s.a1)
    cr.arcNegative(this._cx, this._cy, s.inner, s.a1, s.a0)
    cr.closePath()
    cr.setSourceRgb(r, g, b); cr.fillPreserve()
    cr.setSourceRgba(0, 0, 0, 0.28); cr.setLineWidth(1); cr.stroke()
  }
}

/* Whether angle `a` (any range) lies within the clockwise arc [a0, a1]. */
function arcContains(a: number, a0: number, a1: number): boolean {
  const len = ((a1 - a0) % TAU + TAU) % TAU
  if (len >= TAU - 1e-6) return true
  const d = ((a - a0) % TAU + TAU) % TAU
  return d <= len
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

/* HSV (h in degrees, s/v in 0..1) → RGB in 0..1. */
function hsv(h: number, s: number, v: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 60
  const c = v * s, x = c * (1 - Math.abs((hh % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (hh < 1) { r = c; g = x } else if (hh < 2) { r = x; g = c }
  else if (hh < 3) { g = c; b = x } else if (hh < 4) { g = x; b = c }
  else if (hh < 5) { r = x; b = c } else { r = c; b = x }
  return [r + m, g + m, b + m]
}
