/**
 * SelectionModel — encapsulates multi-selection state and operations
 * 
 * Wraps Gtk.MultiSelection to provide a cohesive selection API,
 * separating selection logic from FileView rendering concerns.
 */

import Gtk from 'gi:Gtk-4.0'
import type { GFileInfo } from '../core/types.ts'

export interface SelectionListener {
  onSelectionChanged(): void
}

/**
 * Selection state and operations for file lists
 */
export class SelectionModel {
  private model: any // Gtk.MultiSelection
  private store: any // Gio.ListStore
  private rows: GFileInfo[] = []
  private listeners: SelectionListener[] = []

  constructor(store: any) {
    this.store = store
    this.model = Gtk.MultiSelection.new(store)
    this.model.on('selection-changed', () => this._notifyListeners())
  }

  /** Get the underlying GTK MultiSelection model (for view binding) */
  getModel(): any {
    return this.model
  }

  /** Set the rows array for index-based operations */
  setRows(rows: GFileInfo[]): void {
    this.rows = rows
  }

  /** Subscribe to selection changes */
  addListener(listener: SelectionListener): void {
    this.listeners.push(listener)
  }

  removeListener(listener: SelectionListener): void {
    const idx = this.listeners.indexOf(listener)
    if (idx >= 0) this.listeners.splice(idx, 1)
  }

  private _notifyListeners(): void {
    for (const listener of this.listeners) listener.onSelectionChanged()
  }

  // Selection queries
  isSelected(index: number): boolean {
    return this.model.isSelected(index)
  }

  getSelectedCount(): number {
    return Number(this.model.getSelection().getSize())
  }

  isEmpty(): boolean {
    return this.getSelectedCount() === 0
  }

  getFirstSelectedIndex(): number {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.isSelected(i)) return i
    }
    return -1
  }

  /** Get keys of currently-selected rows (null if selection is empty) */
  getSelectedKeys(): Set<string> | null {
    if (this.isEmpty()) return null
    const keys = new Set<string>()
    for (let i = 0; i < this.rows.length; i++) {
      if (this.isSelected(i)) keys.add(this.rows[i]._key)
    }
    return keys
  }

  // Selection modifications
  selectItem(index: number, unselectOthers: boolean = false): void {
    this.model.selectItem(index, unselectOthers)
  }

  unselectItem(index: number): void {
    this.model.unselectItem(index)
  }

  selectAll(): void {
    this.model.selectAll()
  }

  unselectAll(): void {
    this.model.unselectAll()
  }

  invertSelection(): void {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.isSelected(i)) this.unselectItem(i)
      else this.selectItem(i, false)
    }
  }

  /** Select rows by glob pattern on their names */
  selectByGlob(pattern: string): void {
    const { default: minimatch } = await import('npm:minimatch@9.0.3')
    this.unselectAll()
    for (let i = 0; i < this.rows.length; i++) {
      if (minimatch(this.rows[i].getDisplayName(), pattern)) {
        this.selectItem(i, false) // add to selection
      }
    }
  }

  /** Restore selection from saved keys */
  restoreSelection(savedKeys: Set<string>): void {
    if (!savedKeys) return
    this.unselectAll()
    for (let i = 0; i < this.rows.length; i++) {
      if (savedKeys.has(this.rows[i]._key)) {
        this.selectItem(i, false)
      }
    }
  }
}
