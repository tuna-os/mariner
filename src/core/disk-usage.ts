import { opendir, lstat } from 'node:fs/promises'
import { join } from 'node:path'

/* One top-level child of a scanned directory, with its total (recursive for
 * directories) size in bytes. */
export interface UsageNode { name: string; path: string; bytes: number; isDir: boolean }

/* Measure the disk usage of each direct child of `dir`, asynchronously and
 * cancellably (node fs — local paths only). Children are processed one at a
 * time; after each completes, `onProgress` receives the running list sorted
 * largest-first (so the treemap fills in progressively), and once more with
 * done=true when finished. Symlinked directories are counted but not descended
 * (cycle safety), matching the file walker. Hidden entries are included — disk
 * analysis should surface .cache and friends. */
export function scanChildren(
  dir: string,
  onProgress: (nodes: UsageNode[], done: boolean) => void,
  isCancelled: () => boolean,
): void {
  const run = async (): Promise<void> => {
    let handle
    try { handle = await opendir(dir) } catch { onProgress([], true); return }
    const nodes: UsageNode[] = []
    for await (const entry of handle) {
      if (isCancelled()) return
      const full = join(dir, entry.name)
      const isDir = entry.isDirectory() && !entry.isSymbolicLink()
      let bytes = 0
      if (isDir) bytes = await dirSize(full, isCancelled)
      else { try { bytes = (await lstat(full)).size } catch { /* vanished */ } }
      nodes.push({ name: entry.name, path: full, bytes, isDir })
      nodes.sort((a, b) => b.bytes - a.bytes)
      onProgress(nodes.slice(), false)
    }
    if (!isCancelled()) onProgress(nodes.slice(), true)
  }
  run()
}

/* Recursively sum the byte size of a directory subtree. */
async function dirSize(dir: string, isCancelled: () => boolean): Promise<number> {
  let total = 0
  const walk = async (d: string): Promise<void> => {
    let handle
    try { handle = await opendir(d) } catch { return }
    for await (const entry of handle) {
      if (isCancelled()) return
      const full = join(d, entry.name)
      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(full)
      else { try { total += (await lstat(full)).size } catch { /* vanished */ } }
    }
  }
  await walk(dir)
  return total
}
