import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { diskUsage, fsTypeForPath, isSlowFs, listPartitions } from '../src/core/drives.ts'

/* drives.ts reads the live /proc/mounts, so these assert properties that hold
 * on any Linux host rather than exact mount tables. They skip where /proc/mounts
 * does not exist (the module itself degrades to empty results there). */
const hasProcMounts = existsSync('/proc/mounts')

describe('diskUsage', () => {
  test('used and free add up to total, fraction is used/total', async () => {
    const u = await diskUsage(tmpdir())
    assert.ok(u.total > 0)
    assert.equal(u.used + u.free, u.total)
    assert.ok(u.fraction >= 0 && u.fraction <= 1)
    assert.equal(u.fraction, u.used / u.total)
  })

  test('rejects when the path does not exist', async () => {
    const gone = join(mkdtempSync(join(tmpdir(), 'mariner-drives-')), 'missing')
    rmSync(join(gone, '..'), { recursive: true })
    await assert.rejects(diskUsage(gone))
  })
})

describe('fsTypeForPath', { skip: !hasProcMounts }, () => {
  test('resolves the root filesystem for a path on it', () => {
    assert.notEqual(fsTypeForPath('/'), '')
  })

  test('picks the longest matching mount point, not the first', () => {
    assert.equal(fsTypeForPath('/proc'), 'proc')
    assert.equal(fsTypeForPath('/proc/self/status'), 'proc')
  })

  test('does not treat a sibling with a shared name prefix as inside a mount', () => {
    /* "/procfoo" shares the "/proc" prefix but is not under that mount. */
    assert.notEqual(fsTypeForPath('/procfoo'), 'proc')
  })
})

describe('isSlowFs', { skip: !hasProcMounts }, () => {
  test('false for local kernel filesystems', () => {
    assert.equal(isSlowFs('/proc'), false)
  })
})

describe('listPartitions', { skip: !hasProcMounts }, () => {
  const parts = listPartitions()

  test('only lists real block devices, never loopbacks or squashfs', () => {
    for (const p of parts) {
      assert.ok(p.device.startsWith('/dev/'), p.device)
      assert.ok(!p.device.startsWith('/dev/loop'), p.device)
      assert.notEqual(p.fsType, 'squashfs')
    }
  })

  test('one row per device and every row carries a label', () => {
    assert.equal(new Set(parts.map((p) => p.device)).size, parts.length)
    for (const p of parts) assert.notEqual(p.label, '')
  })

  test('root is first, the rest sorted by mount path', () => {
    const rest = parts.filter((p) => p.mountPath !== '/').map((p) => p.mountPath)
    assert.deepEqual(
      rest,
      [...rest].sort((a, b) => a.localeCompare(b)),
    )
    const rootIdx = parts.findIndex((p) => p.mountPath === '/')
    if (rootIdx !== -1) assert.equal(rootIdx, 0)
  })
})
