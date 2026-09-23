import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

/* Regression test for the "Cannot mix BigInt and other types" crash when
 * sorting by Size or Modified: node-gtk surfaces gint64 as BigInt, so the
 * comparator's `r * dir` threw. Needs the gi: modules (node-gtk); skips
 * where the runtime lacks them (plain `npm test` without dependencies). */

let comparator: typeof import('../src/core/comparator.ts') | null = null
let format: typeof import('../src/core/format.ts') | null = null
try {
  comparator = await import('../src/core/comparator.ts')
  format = await import('../src/core/format.ts')
} catch {
  comparator = null
  format = null
}

/* Minimal GFileInfo stand-in. Sizes and datetimes are BigInt, exactly as
 * node-gtk delivers them for gint64-backed attributes. */
const file = (over: Record<string, unknown>) => ({
  getFileType: () => -1,
  getContentType: () => 'text/plain',
  getDisplayName: () => null,
  getName: () => 'file',
  getModificationDateTime: () => null,
  ...over,
})
const bigDt = (unix: bigint) => ({ toUnix: () => unix })

describe('comparator (BigInt gint64)', { skip: !comparator || !format }, () => {
  test('size sort coerces BigInt sizes to numbers', () => {
    const a = file({ getSize: () => 10n, getName: () => 'a' })
    const b = file({ getSize: () => 5n, getName: () => 'b' })
    const cmp = comparator!.makeComparator('size', false)
    const r = cmp(a as any, b as any)
    assert.equal(typeof r, 'number')
    assert.ok(r > 0)
    assert.deepEqual([a, b].sort(cmp as any).map((f: any) => f.getName()), ['b', 'a'])
  })

  test('modified sort coerces BigInt timestamps to numbers', () => {
    const a = file({ getSize: () => 1n, getName: () => 'a', getModificationDateTime: () => bigDt(200n) })
    const b = file({ getSize: () => 1n, getName: () => 'b', getModificationDateTime: () => bigDt(100n) })
    const cmp = comparator!.makeComparator('modified', false)
    const r = cmp(a as any, b as any)
    assert.equal(typeof r, 'number')
    assert.ok(r > 0)
  })

  test('modifiedUnix returns a number even when toUnix yields BigInt', () => {
    const info = file({ getModificationDateTime: () => bigDt(1700000000n) })
    const v = format!.modifiedUnix(info as any)
    assert.equal(typeof v, 'number')
    assert.equal(v, 1700000000)
  })

  test('descending order still works on coerced values', () => {
    const a = file({ getSize: () => 1n, getName: () => 'a' })
    const b = file({ getSize: () => 2n, getName: () => 'b' })
    assert.ok(comparator!.makeComparator('size', true)(a as any, b as any) > 0)
  })
})
