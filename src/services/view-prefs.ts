import GLib from 'gi:GLib-2.0'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { defaultColumnConfig, normalizeColumns } from '../core/columns.ts'
import type { ColumnConfig, ViewMode } from '../core/types.ts'

const DIR = GLib.getUserConfigDir() + '/mariner'
const FILE = DIR + '/view-prefs.json'

/* The view choices we persist across runs: grid-vs-list mode and the list-view's
 * visible/ordered columns. */
export interface ViewPrefs { viewMode: ViewMode; columns: ColumnConfig[] }

/* Persist the user's view choices across runs (same JSON-under-config-dir
 * pattern as window-state.ts — we have no GSettings schema installed). Columns
 * are normalized against the registry on load so a stored config stays valid
 * across releases (see core/columns.ts). */
export function loadViewPrefs(): ViewPrefs {
  try {
    const raw = JSON.parse(readFileSync(FILE, 'utf8'))
    return {
      viewMode: raw.viewMode === 'list' ? 'list' : 'grid',
      columns: Array.isArray(raw.columns) ? normalizeColumns(raw.columns) : defaultColumnConfig(),
    }
  } catch { return { viewMode: 'grid', columns: defaultColumnConfig() } }
}

export function saveViewPrefs(prefs: ViewPrefs): void {
  try {
    mkdirSync(DIR, { recursive: true })
    writeFileSync(FILE, JSON.stringify({ viewMode: prefs.viewMode, columns: prefs.columns }))
  } catch { /* non-fatal */ }
}
