import GLib from 'gi:GLib-2.0'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

/* Global most-recently-visited folder store with frecency ranking, feeding the
 * command palette's "jump to folder" list. Panes record a visit on every
 * explicit navigation; entries are keyed by URI, deduped, and persisted to a
 * small JSON file under the user config dir (same pattern as window-state.ts).
 * "Frecency" = frequency decayed by recency, so a folder you open often and
 * recently outranks one you opened once long ago. */

const DIR = GLib.getUserConfigDir() + '/mariner'
const FILE = DIR + '/recent-folders.json'
const CAP = 200                    /* keep the top-N by frecency; prune the rest */
const HALFLIFE_DAYS = 30           /* a visit's weight halves every 30 days */
const DAY_MS = 24 * 60 * 60 * 1000

interface Visit { uri: string; count: number; last: number }   /* last = ms since epoch */
export interface RecentFolder { uri: string; score: number }

let store: Map<string, Visit> | null = null

function load(): Map<string, Visit> {
  if (store) return store
  store = new Map()
  try {
    const arr: Visit[] = JSON.parse(readFileSync(FILE, 'utf8'))
    for (const v of arr) if (v && typeof v.uri === 'string') store.set(v.uri, v)
  } catch { /* first run / corrupt file → start empty */ }
  return store
}

function save(s: Map<string, Visit>): void {
  try { mkdirSync(DIR, { recursive: true }); writeFileSync(FILE, JSON.stringify([...s.values()])) }
  catch { /* non-fatal */ }
}

function frecency(v: Visit): number {
  const ageDays = Math.max(0, (Date.now() - v.last) / DAY_MS)
  return v.count * Math.pow(0.5, ageDays / HALFLIFE_DAYS)
}

/* Record a visit to `uri` (bumping its count + recency), then persist. */
export function recordFolderVisit(uri: string): void {
  const s = load()
  const v = s.get(uri)
  if (v) { v.count++; v.last = Date.now() }
  else s.set(uri, { uri, count: 1, last: Date.now() })

  if (s.size > CAP) {
    const kept = [...s.values()].sort((a, b) => frecency(b) - frecency(a)).slice(0, CAP)
    store = new Map(kept.map(k => [k.uri, k]))
  }
  save(store!)
}

/* Recently-visited folders, most-frecent first, optionally excluding one URI
 * (the folder you're already in). */
export function recentFolders(excludeUri?: string): RecentFolder[] {
  return [...load().values()]
    .filter(v => v.uri !== excludeUri)
    .map(v => ({ uri: v.uri, score: frecency(v) }))
    .sort((a, b) => b.score - a.score)
}
