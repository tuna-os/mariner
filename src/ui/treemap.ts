import Gtk from 'gi:Gtk-4.0'
import Pango from 'gi:Pango-1.0'
import PangoCairo from 'gi:PangoCairo-1.0'
import { squarify } from '../core/squarify.ts'
import type { Tile } from '../core/squarify.ts'
import { formatBytes } from '../core/format.ts'
import type { UsageNode } from '../core/disk-usage.ts'

/* GNOME HIG-ish palette; tiles are coloured by index for visual separation. */
const PALETTE: Array<[number, number, number]> = [
  [0.20, 0.52, 0.89], [0.20, 0.82, 0.48], [0.96, 0.83, 0.18], [1.00, 0.47, 0.00],
  [0.88, 0.11, 0.14], [0.57, 0.26, 0.68], [0.60, 0.42, 0.27], [0.13, 0.69, 0.69],
  [0.82, 0.43, 0.62], [0.37, 0.36, 0.39],
]
const GAP = 1
const LABEL_MIN_W = 46
const LABEL_MIN_H = 26

/* A squarified treemap of a directory's children rendered on a Gtk.DrawingArea
 * (cairo tiles + PangoCairo labels). Hover highlights a tile; clicking a folder
 * tile fires onActivate (the host drills into it). Layout is recomputed each
 * draw from the current allocation, so it reflows on resize for free. */
export class TreemapView {
  widget: any
  nodes: UsageNode[] = []
  tiles: Array<Tile<UsageNode>> = []
  _hover = -1
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

  setNodes(nodes: UsageNode[]): void {
    this.nodes = nodes.filter(n => n.bytes > 0)
    this.widget.queueDraw()
  }

  /* ---- interaction ---- */
  _hit(x: number, y: number): number {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i]
      if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) return i
    }
    return -1
  }

  _setHover(i: number): void {
    if (i === this._hover) return
    this._hover = i
    this.onHover(i >= 0 ? this.tiles[i].item : null)
    this.widget.queueDraw()
  }

  _click(x: number, y: number): void {
    const i = this._hit(x, y)
    if (i >= 0 && this.tiles[i].item.isDir) this.onActivate(this.tiles[i].item)
  }

  /* ---- drawing ---- */
  _draw(cr: any, w: number, h: number): void {
    this.tiles = squarify(this.nodes.map(n => ({ item: n, value: n.bytes })), 0, 0, w, h)
    for (let i = 0; i < this.tiles.length; i++) this._drawTile(cr, this.tiles[i], i)
  }

  _drawTile(cr: any, t: Tile<UsageNode>, i: number): void {
    const x = t.x + GAP, y = t.y + GAP
    const tw = Math.max(0, t.w - GAP * 2), th = Math.max(0, t.h - GAP * 2)
    if (tw <= 0 || th <= 0) return
    const [r, g, b] = PALETTE[i % PALETTE.length]
    const lit = i === this._hover ? 0.18 : 0
    cr.setSourceRgb(r + (1 - r) * lit, g + (1 - g) * lit, b + (1 - b) * lit)
    cr.rectangle(x, y, tw, th)
    cr.fill()

    if (tw < LABEL_MIN_W || th < LABEL_MIN_H) return
    /* Dark text on light tiles, white on dark (relative luminance). */
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    cr.setSourceRgba(...(lum > 0.6 ? [0, 0, 0, 0.85] : [1, 1, 1, 0.95]))
    cr.save()
    cr.rectangle(x + 6, y + 4, tw - 12, th - 8); cr.clip()
    const layout = PangoCairo.createLayout(cr)
    layout.setFontDescription(Pango.FontDescription.fromString('Sans 10'))
    layout.setEllipsize(Pango.EllipsizeMode.END)
    layout.setWidth((tw - 12) * Pango.SCALE)
    layout.setText(`${t.item.name}\n${formatBytes(t.item.bytes)}`, -1)
    cr.moveTo(x + 6, y + 4)
    PangoCairo.showLayout(cr, layout)
    cr.restore()
  }
}
