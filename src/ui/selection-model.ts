import Gtk from 'gi:Gtk-4.0'
import GObject from 'gi:GObject-2.0'
import type { GFileInfo, Entry } from '../core/types.ts'

/**
 * SelectionModel encapsulates GTK MultiSelection state management and selection
 * feedback logic, extracted from FileView to enable independent testing and reuse.
 *
 * Responsibilities:
 * - Maintain GtkMultiSelection and underlying data model (GListStore)
 * - Track selection state and history
 * - Calculate selection statistics (count, total size)
 * - Provide selection change notifications
 *
 * Does NOT handle:
 * - Rendering (that stays in FileView)
 * - Keyboard input (FileView/separate controller)
 * - Drag-and-drop (separate controller)
 */
export class SelectionModel {
  store: any
  selection: any
  _rows: GFileInfo[] = []
  _statusDirty = false
  _statusTimer = 0
  _lastStatus = { count: 0, size: 0n }

  onSelectionChanged?: () => void

  constructor() {
    const FILE_INFO_TYPE = GObject.type_from_name('GFileInfo')
    this.store = Gtk.ListStore.new(FILE_INFO_TYPE)
    this.selection = Gtk.MultiSelection.new(this.store)

    // Coalesce selection-changed signals onto the idle loop (one pass per frame)
    this.selection.on('selection-changed', () => this._scheduleStatus())
    this.store.on('items-changed', () => this._scheduleStatus())
  }

  get rows(): GFileInfo[] {
    return this._rows
  }

  /**
   * Replace the entire model with new entries.
   * Used during navigation to show a completely different folder.
   */
  reset(entries: GFileInfo[]): void {
    this._rows = entries
    this.store.removeAll()
    for (const info of entries) {
      this.store.append(info)
    }
  }

  /**
   * Insert entries into the model maintaining sort order.
   * Used during incremental loads and search result streaming.
   */
  insertSorted(
    entries: GFileInfo[],
    compareFn: (a: GFileInfo, b: GFileInfo) => number
  ): void {
    for (const info of entries) {
      let pos = this._rows.length
      // Binary search for insertion point
      let lo = 0, hi = this._rows.length
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        if (compareFn(this._rows[mid], info) < 0) lo = mid + 1
        else hi = mid
      }
      pos = lo

      this._rows.splice(pos, 0, info)
      this.store.insert(pos, info)
    }
  }

  /**
   * Get the URIs of currently selected entries.
   */
  getSelectedUris(): string[] {
    const uris: string[] = []
    const bitset = this.selection.getSelection()
    let pos = bitset.getNthMarked(0)
    while (pos !== GLib.MAXUINT32) {
      if (pos < this._rows.length) {
        const info = this._rows[pos]
        uris.push(info.getAttributeAsString('standard::name'))
      }
      pos = bitset.getNthMarked(pos + 1)
    }
    return uris
  }

  /**
   * Get count of selected entries.
   */
  getSelectionCount(): number {
    return this.selection.getNItems()
  }

  /**
   * Calculate total size of selected entries.
   */
  getSelectionSize(): bigint {
    let total = 0n
    const bitset = this.selection.getSelection()
    let pos = bitset.getNthMarked(0)
    while (pos !== GLib.MAXUINT32) {
      if (pos < this._rows.length) {
        const info = this._rows[pos]
        const size = info.getAttributeUInt64('standard::size')
        total += BigInt(size)
      }
      pos = bitset.getNthMarked(pos + 1)
    }
    return total
  }

  /**
   * Select all entries.
   */
  selectAll(): void {
    this.selection.selectAll()
  }

  /**
   * Clear selection.
   */
  unselectAll(): void {
    this.selection.unselectAll()
  }

  /**
   * Toggle selection of a specific entry by position.
   */
  toggleSelection(pos: number): void {
    const bitset = this.selection.getSelection()
    if (bitset.contains(pos)) {
      this.selection.unselect(pos)
    } else {
      this.selection.select(pos)
    }
  }

  /**
   * Schedule a status update on the idle loop.
   * Coalesces rapid changes into a single update.
   */
  private _scheduleStatus(): void {
    if (this._statusDirty) return
    this._statusDirty = true

    GLib.idleAdd(GLib.PRIORITY_DEFAULT, () => {
      this._statusDirty = false
      const count = this.getSelectionCount()
      const size = this.getSelectionSize()

      if (this._lastStatus.count !== count || this._lastStatus.size !== size) {
        this._lastStatus = { count, size }
        this.onSelectionChanged?.()
      }
      return false // Don't repeat
    })
  }
}
