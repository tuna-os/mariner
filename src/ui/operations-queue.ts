import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import GLib from 'gi:GLib-2.0'
import Pango from 'gi:Pango-1.0'
import type { OpBegin, OpProgress, OpDone, OpError } from '../core/types.ts'

interface Row { widget: any; bar: any; determinate: boolean }

/* Header button + popover listing the active long file operations, each with a
 * per-op progress bar and (when cancellable) a ✕. Hidden while idle. Fed by any
 * emitter that speaks the op event protocol (FileOperations, ArchiveService);
 * `bind` namespaces ids by a prefix so multiple sources never collide. */
export class OperationsQueue {
  button: any
  _popover: any
  _list: any
  _rows = new Map<string, Row>()
  _pulseTimer = 0

  constructor() {
    this._list = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, marginTop: 10, marginBottom: 10, marginStart: 10, marginEnd: 10 })
    this._list.setSizeRequest(320, -1)
    this._popover = new Gtk.Popover({ child: this._list })
    this.button = new Gtk.MenuButton({ popover: this._popover, tooltipText: 'File Operations', visible: false })
    this.button.setChild(new Adw.Spinner({ widthRequest: 16, heightRequest: 16 }))
  }

  /* Subscribe to an op emitter. `cancel(id)` (optional) enables per-op ✕. */
  bind(emitter: any, prefix: string, cancel?: (id: number) => void): void {
    emitter.on('begin', (p: OpBegin) => this._add(prefix + p.id, p.title, cancel ? () => cancel(p.id) : null))
    emitter.on('progress', (p: OpProgress) => this._progress(prefix + p.id, p.done, p.total))
    emitter.on('done', (p: OpDone) => this._remove(prefix + p.id))
    emitter.on('error', (p: OpError) => { if (p.id != null) this._remove(prefix + p.id) })
  }

  _add(key: string, title: string, cancel: (() => void) | null): void {
    if (this._rows.has(key)) return
    const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 })
    const top = new Gtk.Box({ spacing: 8 })
    const label = new Gtk.Label({ label: title, xalign: 0, hexpand: true, ellipsize: Pango.EllipsizeMode.MIDDLE })
    top.append(label)
    if (cancel) {
      const btn = new Gtk.Button({ iconName: 'window-close-symbolic', tooltipText: 'Cancel', cssClasses: ['flat', 'circular'], valign: Gtk.Align.CENTER })
      btn.on('clicked', () => cancel())
      top.append(btn)
    }
    const bar = new Gtk.ProgressBar({ pulseStep: 0.1, fraction: 0 })
    box.append(top)
    box.append(bar)
    this._list.append(box)
    this._rows.set(key, { widget: box, bar, determinate: false })
    this._sync()
  }

  _progress(key: string, done: number, total: number): void {
    const row = this._rows.get(key)
    if (!row) return
    if (total > 0) { row.determinate = true; row.bar.setFraction(Math.min(1, done / total)) }
    this._sync()
  }

  _remove(key: string): void {
    const row = this._rows.get(key)
    if (!row) return
    this._list.remove(row.widget)
    this._rows.delete(key)
    this._sync()
  }

  _sync(): void {
    const active = this._rows.size > 0
    this.button.setVisible(active)
    if (!active) { try { this._popover.popdown() } catch {} }
    /* Pulse any op that has no determinate progress (e.g. archive ops). */
    const needPulse = active && [...this._rows.values()].some(r => !r.determinate)
    if (needPulse && !this._pulseTimer) {
      this._pulseTimer = GLib.timeoutAdd(GLib.PRIORITY_DEFAULT, 120, () => {
        for (const r of this._rows.values()) if (!r.determinate) r.bar.pulse()
        return true
      })
    } else if (!needPulse && this._pulseTimer) {
      GLib.sourceRemove(this._pulseTimer); this._pulseTimer = 0
    }
  }
}
