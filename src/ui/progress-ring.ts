import Gtk from 'gi:Gtk-4.0'

const TAU = Math.PI * 2
const TOP = -Math.PI / 2          // 12 o'clock; arcs sweep clockwise from here
const SPIN_ARC = Math.PI / 2      // length of the indeterminate sweep (90°)
const SPIN_STEP = Math.PI / 6     // rotation per tick (30°)

/* A small circular progress ring, a faithful port of GNOME Files'
 * nautilus-progress-paintable.c: the completed fraction is stroked from the top
 * clockwise at full opacity, the remainder at 25% opacity — so the drawn arc's
 * ratio of the circle equals the operation's completion. With no known total
 * (indeterminate ops), a fixed arc spins instead (advance via `tick`). The
 * stroke colour is the widget's current CSS foreground, so it tracks the theme
 * exactly like nautilus's symbolic paintable. */
export class ProgressRing {
  widget: any
  size: number
  lineWidth: number
  _progress = 0
  _spinning = false
  _angle = TOP

  constructor(size = 16, lineWidth = 2) {
    this.size = size
    this.lineWidth = lineWidth
    this.widget = new Gtk.DrawingArea({
      widthRequest: size, heightRequest: size,
      valign: Gtk.Align.CENTER, halign: Gtk.Align.CENTER,
    })
    this.widget.setDrawFunc((...a: any[]) => this._draw(a[0], a[1], a[2], a[3]))
  }

  /* Set the completed fraction (0..1); switches out of indeterminate mode. */
  setProgress(fraction: number): void {
    const p = Math.max(0, Math.min(1, fraction))
    if (!this._spinning && p === this._progress) return
    this._progress = p
    this._spinning = false
    this.widget.queueDraw()
  }

  setSpinning(on: boolean): void {
    if (on === this._spinning) return
    this._spinning = on
    this.widget.queueDraw()
  }

  /* Advance the indeterminate rotation; drive from a timer while spinning. */
  tick(): void {
    if (!this._spinning) return
    this._angle = (this._angle + SPIN_STEP) % TAU
    this.widget.queueDraw()
  }

  _draw(area: any, cr: any, width: number, height: number): void {
    const r = this.size / 2 - this.lineWidth / 2
    const c = area.getColor()          // theme foreground (symbolic-like)
    cr.translate(width / 2, height / 2)
    cr.setLineWidth(this.lineWidth)

    if (this._spinning) {
      cr.setSourceRgba(c.red, c.green, c.blue, c.alpha * 0.25)
      cr.arc(0, 0, r, 0, TAU); cr.stroke()
      cr.setSourceRgba(c.red, c.green, c.blue, c.alpha)
      cr.arc(0, 0, r, this._angle, this._angle + SPIN_ARC); cr.stroke()
      return
    }

    const arcEnd = this._progress * TAU + TOP
    cr.setSourceRgba(c.red, c.green, c.blue, c.alpha)
    cr.arc(0, 0, r, TOP, arcEnd); cr.stroke()
    cr.setSourceRgba(c.red, c.green, c.blue, c.alpha * 0.25)
    cr.arc(0, 0, r, arcEnd, TOP + TAU); cr.stroke()
  }
}
