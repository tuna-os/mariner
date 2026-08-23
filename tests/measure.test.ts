import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import { measureUsage, type Usage } from '../src/core/measure.ts'

function measure(path: string): Promise<Usage> {
  return new Promise(resolve => {
    measureUsage(path, (usage, done) => {
      if (done) resolve({ ...usage })
    }, () => false)
  })
}

describe('measureUsage', () => {
  test('counts nested files, folders, bytes, and symlinks without following them', async t => {
    const base = await mkdtemp(join(tmpdir(), 'mariner-measure-'))
    t.after(() => rm(base, { recursive: true, force: true }))
    await mkdir(join(base, 'nested'))
    await writeFile(join(base, 'one'), '1234')
    await writeFile(join(base, 'nested', 'two'), '123456')
    await symlink(join(base, 'nested'), join(base, 'nested-link'))

    const usage = await measure(base)

    assert.equal(usage.folders, 1)
    assert.equal(usage.files, 3)
    assert.ok(usage.bytes >= 10)
  })

  test('reports empty or missing directories as complete', async () => {
    assert.deepEqual(await measure(join(tmpdir(), 'mariner-does-not-exist')), {
      bytes: 0, files: 0, folders: 0,
    })
  })
})
