import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'

/* Shared primitive for services that cache state in a WAL-mode node:sqlite
 * database under GLib.getUserDataDir()/mariner (tags-service, dir-size-service).
 * Opens the database, creates `dir` if needed, and enables WAL. On any failure
 * (corrupt file, no permissions) returns null so the caller can fall back to
 * running memory-only for the session rather than crashing. */
export function openWalDatabase(dir: string, file: string): any {
  try {
    mkdirSync(dir, { recursive: true })
    const db = new DatabaseSync(file)
    db.exec('PRAGMA journal_mode = WAL')
    return db
  } catch {
    return null
  }
}

/* `PRAGMA data_version` only advances for commits made by OTHER connections
 * to the same database file (not our own writes) — lets a service detect
 * whether another Mariner process touched the data since it last checked. */
export function readDataVersion(db: any): number {
  try { return Number(db.prepare('PRAGMA data_version').get().data_version) } catch { return -1 }
}
