import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import Gdk from 'gi:Gdk-4.0'
import GLib from 'gi:GLib-2.0'
import Pango from 'gi:Pango-1.0'
import { fuzzyMatch } from '../core/fuzzy-match.ts'

/* Command palette (Ctrl+P): one search field over a single ranked list of
 * commands and recently-visited folders. The window builds the item list fresh
 * on each open (it's selection- and split-aware); this widget only filters,
 * ranks, renders and runs.
 *
 * Ordering:
 *   - empty query   → `primary` items in the order given (the context actions
 *                     for the current selection, then recent folders by frecency).
 *   - typed query   → every item fuzzy-ranked by score, so a strong folder-name
 *                     match outranks a weak action match; a folder's frecency is
 *                     folded in as a small tie-break bonus.
 *
 * Built once per window and reused (present/close), like QuickLook. */

export interface PaletteItem {
  label: string                 /* primary text (command name / folder name) */
  detail?: string               /* dim trailing text (accelerator / folder path) */
  icon?: string                 /* symbolic icon name */
  group: 'action' | 'folder'
  search: string                /* haystack matched against the query */
  frecencyBonus?: number        /* folders: 0..~0.25, added to the fuzzy score */
  primary?: boolean             /* shown when the query is empty */
  run: () => void
}

const PAGE = 8   /* rows moved by Page Up/Down */

export class CommandPalette {
  parent: any
  dialog: any
  entry: any
  listBox: any
  scroller: any
  items: PaletteItem[] = []
  filtered: PaletteItem[] = []
  selected = 0

  constructor(parent: any) {
    this.parent = parent
    this._build()
  }

  _build(): void {
    this.dialog = new Adw.Dialog()
    this.dialog.setContentWidth(600)
    this.dialog.addCssClass('mariner-command-palette')

    const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })

    this.entry = new Gtk.SearchEntry({ placeholderText: 'Run a command or jump to a folder…' })
    this.entry.addCssClass('mariner-command-entry')
    /* 'changed' (GtkEditable, immediate) not 'search-changed' (debounced ~150ms)
     * — a command palette should filter on every keystroke without lag. */
    this.entry.on('changed', () => this._refilter())

    /* Nav keys in the CAPTURE phase so the entry doesn't first consume Enter /
     * Escape (the SearchEntry would otherwise clear itself on Escape). */
    const keys = new Gtk.EventControllerKey()
    keys.setPropagationPhase(Gtk.PropagationPhase.CAPTURE)
    keys.on('key-pressed', (...a: any[]) => this._onKey(a[0]))
    this.entry.addController(keys)

    this.listBox = new Gtk.ListBox({ selectionMode: Gtk.SelectionMode.SINGLE })
    this.listBox.addCssClass('mariner-command-list')
    this.listBox.on('row-activated', (...a: any[]) => {
      const item = this.filtered[a[a.length - 1].getIndex()]
      if (item) this._run(item)
    })

    this.scroller = new Gtk.ScrolledWindow({
      hscrollbarPolicy: Gtk.PolicyType.NEVER,
      propagateNaturalHeight: true,
      maxContentHeight: 420,
    })
    this.scroller.setChild(this.listBox)

    box.append(this.entry)
    box.append(this.scroller)
    this.dialog.setChild(box)
  }

  /* Present with a fresh item list. */
  open(items: PaletteItem[]): void {
    this.items = items
    this.entry.setText('')
    this._refilter()
    this.dialog.present(this.parent)
    this.entry.grabFocus()
  }

  _refilter(): void {
    const q = this.entry.getText().trim()
    if (!q) {
      this.filtered = this.items.filter(i => i.primary)
    } else {
      /* Strict subsequence match (no typo-drop): a small, known command set
       * wants predictable results over forgiveness — a dropped char would let
       * short queries match unrelated commands. */
      const scored: Array<{ item: PaletteItem; score: number }> = []
      for (const item of this.items) {
        const m = fuzzyMatch(q, item.search)
        if (m) scored.push({ item, score: m.score + (item.frecencyBonus ?? 0) })
      }
      scored.sort((a, b) => b.score - a.score)
      this.filtered = scored.map(s => s.item)
    }
    this._render()
  }

  _render(): void {
    let child
    while ((child = this.listBox.getFirstChild())) this.listBox.remove(child)
    for (const item of this.filtered) this.listBox.append(this._row(item))
    this.selected = 0
    this._select(0)
  }

  _row(item: PaletteItem): any {
    const row = new Gtk.ListBoxRow()
    row.addCssClass('mariner-command-row')
    const hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })

    hbox.append(new Gtk.Image({ iconName: item.icon || (item.group === 'folder' ? 'folder-symbolic' : 'application-x-executable-symbolic') }))
    hbox.append(new Gtk.Label({ label: item.label, xalign: 0, hexpand: true, ellipsize: Pango.EllipsizeMode.END }))
    if (item.detail) {
      const d = new Gtk.Label({ label: item.detail, xalign: 1, ellipsize: Pango.EllipsizeMode.START })
      d.addCssClass('dim-label')
      d.addCssClass('mariner-command-detail')
      hbox.append(d)
    }
    row.setChild(hbox)
    return row
  }

  _onKey(keyval: number): boolean {
    switch (keyval) {
      case Gdk.KEY_Down:      this._select(this.selected + 1); return true
      case Gdk.KEY_Up:        this._select(this.selected - 1); return true
      case Gdk.KEY_Page_Down: this._select(this.selected + PAGE); return true
      case Gdk.KEY_Page_Up:   this._select(this.selected - PAGE); return true
      case Gdk.KEY_Escape:    this.dialog.close(); return true
      case Gdk.KEY_Return:
      case Gdk.KEY_KP_Enter:  this._activateSelected(); return true
    }
    return false
  }

  _select(i: number): void {
    const n = this.filtered.length
    if (!n) return
    this.selected = Math.max(0, Math.min(n - 1, i))
    const row = this.listBox.getRowAtIndex(this.selected)
    if (row) this.listBox.selectRow(row)
    this._scrollTo(this.selected)
  }

  /* Keep the selected row visible without moving focus off the entry (so typing
   * keeps working). Rows are uniform height, so position = index * rowHeight. */
  _scrollTo(i: number): void {
    const va = this.scroller.getVadjustment()
    if (!va) return
    const first = this.listBox.getRowAtIndex(0)
    const rowH = (first && first.getHeight()) || 40
    const top = i * rowH
    const bottom = top + rowH
    const viewTop = va.getValue()
    const page = va.getPageSize()
    if (top < viewTop) va.setValue(top)
    else if (bottom > viewTop + page) va.setValue(bottom - page)
  }

  _activateSelected(): void {
    const item = this.filtered[this.selected]
    if (item) this._run(item)
  }

  /* Close first, then run on idle so the palette is fully dismissed before an
   * action navigates / opens another dialog / grabs the view's focus. */
  _run(item: PaletteItem): void {
    this.dialog.close()
    GLib.idleAdd(GLib.PRIORITY_DEFAULT_IDLE, () => { try { item.run() } catch {} return false })
  }
}
