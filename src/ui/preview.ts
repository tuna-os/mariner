import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import Gdk from 'gi:Gdk-4.0'
import { displayName } from '../core/format.ts'
import { renderPreview } from './preview-renderers.ts'
import type { Entry } from '../core/types.ts'

/* Quick Look: a floating window that previews the selected entry and pages
 * through the view's entries with the arrow keys. One instance per AppWindow.
 *
 * The window is built ONCE and reused (hidden, not destroyed) — each GtkWindow
 * owns a GSK/Vulkan renderer, so recreating it per open leaks GPU memory until
 * the device OOMs. On close the preview widget is dropped (and any media stream
 * stopped) so its textures / GStreamer pipeline are released between opens.
 * Space (from the file view) or Escape/Space (here) dismiss it — like macOS. */
export class QuickLook {
  parent: any
  win: any = null
  titleWidget: any = null
  contentBin: any = null
  counter: any = null
  entries: Entry[] = []
  index = 0
  _open = false
  onIndex: (i: number) => void = () => {}

  constructor(parent: any) { this.parent = parent }

  get isOpen(): boolean { return this._open }

  toggle(entries: Entry[], index: number, onIndex: (i: number) => void): void {
    if (this._open) { this.close(); return }
    if (!entries.length) return
    this.entries = entries
    this.index = Math.max(0, Math.min(index, entries.length - 1))
    this.onIndex = onIndex
    if (!this.win) this._build()
    this._open = true
    this._show()
    this.win.present()
  }

  close(): void {
    if (!this._open) return
    this._open = false
    this._clearContent()
    if (this.win) this.win.setVisible(false)
  }

  /* Drop the current preview widget so its GPU/media resources are freed;
   * explicitly stop a Gtk.Video's media stream first (it won't finalize while a
   * paintable/pipeline is live). */
  _clearContent(): void {
    if (!this.contentBin) return
    const child = this.contentBin.getChild?.()
    try { if (child?.getMediaStream?.()) child.setMediaStream(null) } catch { /* not a video */ }
    this.contentBin.setChild(null)
  }

  _build(): void {
    this.win = new Adw.Window({ modal: false, resizable: true })
    this.win.setTransientFor(this.parent)
    this.win.setDefaultSize(880, 620)
    this.win.setHideOnClose(true)
    this.win.addCssClass('quicklook')
    /* Reuse the window: intercept the close so GTK hides it instead of destroying
     * the renderer. */
    this.win.on('close-request', () => { this.close(); return true })

    const header = new Adw.HeaderBar()
    this.titleWidget = new Adw.WindowTitle({ title: '' })
    header.setTitleWidget(this.titleWidget)

    const nav = new Gtk.Box({ cssClasses: ['linked'] })
    const prev = new Gtk.Button({ iconName: 'go-previous-symbolic', tooltipText: 'Previous' })
    const next = new Gtk.Button({ iconName: 'go-next-symbolic', tooltipText: 'Next' })
    prev.on('clicked', () => this._step(-1))
    next.on('clicked', () => this._step(1))
    nav.append(prev); nav.append(next)
    header.packStart(nav)

    this.counter = new Gtk.Label({ cssClasses: ['dim-label'] })
    header.packEnd(this.counter)

    this.contentBin = new Adw.Bin({ hexpand: true, vexpand: true })
    this.contentBin.addCssClass('quicklook-content')

    const tv = new Adw.ToolbarView()
    tv.addTopBar(header)
    tv.setContent(this.contentBin)
    this.win.setContent(tv)

    const keys = new Gtk.EventControllerKey()
    keys.on('key-pressed', (...a: any[]) => this._onKey(a[0]))
    this.win.addController(keys)
  }

  _onKey(keyval: number): boolean {
    switch (keyval) {
      case Gdk.KEY_Escape: case Gdk.KEY_space: this.close(); return true
      case Gdk.KEY_Left: case Gdk.KEY_Up: case Gdk.KEY_Page_Up: this._step(-1); return true
      case Gdk.KEY_Right: case Gdk.KEY_Down: case Gdk.KEY_Page_Down: this._step(1); return true
      default: return false
    }
  }

  _step(delta: number): void {
    const n = this.entries.length
    if (!n) return
    this.index = (this.index + delta + n) % n
    this._show()
  }

  _show(): void {
    const { info, file } = this.entries[this.index]
    this.titleWidget.setTitle(displayName(info))
    this.counter.setLabel(`${this.index + 1} / ${this.entries.length}`)
    this._clearContent()
    this.contentBin.setChild(renderPreview(info, file))
    this.onIndex(this.index)
  }
}
