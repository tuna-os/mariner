import { opendir, lstat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import type { Dirent } from 'node:fs'

/* A node in the disk-usage tree: a file or directory with its total (recursive
 * for directories) size. `children` is populated only down to the scan depth —
 * the rings chart shows a bounded number of levels — but `bytes` always reflects
 * the *full* subtree (deeper contents still count toward the size). */
export interface UsageNode {
  name: string
  path: string
  bytes: number
  isDir: boolean
  children?: UsageNode[]
}

const bySizeDesc = (a: UsageNode, b: UsageNode) => b.bytes - a.bytes

/* Scan a directory into a size tree `maxDepth` levels deep (local paths only,
 * node fs), asynchronously and cancellably. Each direct child is fully measured
 * before `onProgress` fires with the running root (children sorted largest
 * first), so the rings fill in wedge by wedge; a final call has done=true.
 * Symlinked dirs are counted but not descended (cycle safety). Hidden entries
 * are included — disk analysis should surface .cache and friends. */
export function scanTree(
  dir: string,
  maxDepth: number,
  onProgress: (root: UsageNode, done: boolean) => void,
  isCancelled: () => boolean,
): void {
  const root: UsageNode = { name: basename(dir) || dir, path: dir, bytes: 0, isDir: true, children: [] }
  const run = async (): Promise<void> => {
    const entries = await readEntries(dir)
    if (!entries) { onProgress(root, true); return }
    for (const entry of entries) {
      if (isCancelled()) return
      const child = await measure(join(dir, entry.name), entry.name, entry, maxDepth - 1, isCancelled)
      root.children!.push(child)
      root.bytes += child.bytes
      root.children!.sort(bySizeDesc)
      onProgress(root, false)
    }
    if (!isCancelled()) onProgress(root, true)
  }
  run()
}

/* Build one node: recurse for directories (always summing bytes, recording
 * children only while depth remains). */
async function measure(path: string, name: string, entry: Dirent, depth: number, isCancelled: () => boolean): Promise<UsageNode> {
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    let bytes = 0
    try { bytes = (await lstat(path)).size } catch { /* vanished */ }
    return { name, path, bytes, isDir: false }
  }
  const node: UsageNode = { name, path, bytes: 0, isDir: true, children: depth > 0 ? [] : undefined }
  const entries = await readEntries(path)
  if (entries) for (const e of entries) {
    if (isCancelled()) break
    const child = await measure(join(path, e.name), e.name, e, depth - 1, isCancelled)
    node.bytes += child.bytes
    node.children?.push(child)
  }
  node.children?.sort(bySizeDesc)
  return node
}

async function readEntries(dir: string): Promise<Dirent[] | null> {
  try {
    const handle = await opendir(dir)
    const out: Dirent[] = []
    for await (const entry of handle) out.push(entry)
    return out
  } catch { return null }   /* permission denied, vanished, not a dir */
}
