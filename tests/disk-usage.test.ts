import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'

import { scanTree } from '../src/core/disk-usage.ts'
import type { UsageNode } from '../src/core/disk-usage.ts'

/* Run scanTree to completion and resolve with the final root. */
function scan(dir: string, depth: number, isCancelled = () => false): Promise<UsageNode> {
  return new Promise((resolve) =>
    scanTree(
      dir,
      depth,
      (root, done) => {
        if (done) resolve(root)
      },
      isCancelled,
    ),
  )
}

/* The node's children, failing the test if they were not recorded. */
function kids(node: UsageNode): UsageNode[] {
  assert.ok(node.children, `${node.name} has recorded children`)
  return node.children
}

/* The named child of a node, failing the test if it is missing. */
function child(node: UsageNode, name: string): UsageNode {
  const found = kids(node).find((c) => c.name === name)
  assert.ok(found, `${name} is a child of ${node.name}`)
  return found
}

let base: string

before(() => {
  base = mkdtempSync(join(tmpdir(), 'mariner-du-'))
  mkdirSync(join(base, 'big', 'deep'), { recursive: true })
  writeFileSync(join(base, 'big', 'a.bin'), Buffer.alloc(100))
  writeFileSync(join(base, 'big', 'deep', 'b.bin'), Buffer.alloc(300))
  mkdirSync(join(base, 'small'))
  writeFileSync(join(base, 'small', 'c.bin'), Buffer.alloc(10))
  writeFileSync(join(base, '.hidden'), Buffer.alloc(5))
})

after(() => rmSync(base, { recursive: true, force: true }))

describe('scanTree', () => {
  test('directory bytes sum the full subtree, past the depth limit', async () => {
    const root = await scan(base, 1)
    const big = child(root, 'big')
    assert.equal(big.bytes, 400)
    assert.equal(big.children, undefined, 'children are not recorded beyond the depth')
    assert.equal(
      root.bytes,
      kids(root).reduce((sum, c) => sum + c.bytes, 0),
    )
  })

  test('children are recorded down to the depth and sorted largest first', async () => {
    const root = await scan(base, 3)
    const sizes = kids(root).map((c) => c.bytes)
    assert.deepEqual(
      sizes,
      [...sizes].sort((a, b) => b - a),
    )
    const big = child(root, 'big')
    assert.deepEqual(
      kids(big).map((c) => c.name),
      ['deep', 'a.bin'],
    )
    assert.equal(kids(big)[0].isDir, true)
    assert.equal(kids(big)[1].isDir, false)
  })

  test('hidden entries are included', async () => {
    const root = await scan(base, 1)
    assert.ok(kids(root).some((c) => c.name === '.hidden'))
  })

  test('symlinked directories are counted but not descended', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mariner-du-link-'))
    try {
      mkdirSync(join(dir, 'real'))
      writeFileSync(join(dir, 'real', 'x.bin'), Buffer.alloc(1000))
      symlinkSync(join(dir, 'real'), join(dir, 'link'))
      const root = await scan(dir, 2)
      const link = child(root, 'link')
      assert.equal(link.isDir, false)
      assert.ok(link.bytes < 1000, 'link size is the link itself, not its target')
      assert.equal(child(root, 'real').bytes, 1000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('an unreadable root reports done with an empty tree', async () => {
    const root = await scan(join(base, 'does-not-exist'), 2)
    assert.equal(root.bytes, 0)
    assert.deepEqual(root.children, [])
  })

  test('cancelling before the scan starts reports no progress', async () => {
    const calls: boolean[] = []
    scanTree(
      base,
      2,
      (_root, done) => calls.push(done),
      () => true,
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.deepEqual(calls, [])
  })
})
