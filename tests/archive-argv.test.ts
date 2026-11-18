import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { compressArgv, extractFolderName } from '../src/core/archive-argv.ts'

/* Names come from the filesystem. Each of these is an option (or, for 7z, a
 * list-file reference) to one of the tools unless option parsing has ended. */
const HOSTILE = ['-m', '-T', '-TTsh x.sh #', '-sdel', '@list', '--checkpoint-action=exec=sh x.sh']
const FORMATS = ['zip', 'tar.gz', 'tar.xz', '7z'] as const

describe('compressArgv', () => {
  for (const format of FORMATS) {
    test(`${format}: names only appear after the end-of-options marker`, () => {
      const argv = compressArgv(format, '/tmp/out', HOSTILE)
      const end = argv.indexOf('--')
      assert.notEqual(end, -1, `no "--" in ${JSON.stringify(argv)}`)
      assert.deepEqual(argv.slice(end + 1), HOSTILE)
      const head = argv.slice(0, end)
      assert.ok(head.includes('/tmp/out'), 'the archive path precedes "--"')
      for (const name of HOSTILE) assert.equal(head.includes(name), false)
    })
  }
})

/* "Extract Here" unpacks each archive into a new folder named by this. The
 * archive's name comes from the filesystem. */
describe('extractFolderName', () => {
  test('drops the archive extension, compound ones whole', () => {
    assert.equal(extractFolderName('photos.zip'), 'photos')
    assert.equal(extractFolderName('release-1.2.tar.gz'), 'release-1.2')
    assert.equal(extractFolderName('backup.TAR.ZST'), 'backup')
    assert.equal(extractFolderName('lib.tbz2'), 'lib')
    assert.equal(extractFolderName('app.jar'), 'app')
  })

  test('later attempts get a counter, so a taken name is never reused', () => {
    assert.equal(extractFolderName('photos.zip', 2), 'photos (2)')
    assert.equal(extractFolderName('photos.zip', 3), 'photos (3)')
  })

  test('never names the viewed folder or its parent', () => {
    for (const name of ['.zip', '..zip', '...zip', '..tar.gz', '...7z']) {
      const folder = extractFolderName(name)
      assert.equal(folder, 'Archive', `${name} gave ${JSON.stringify(folder)}`)
    }
  })

  test('a name that is not an archive is kept whole', () => {
    assert.equal(extractFolderName('notes'), 'notes')
  })
})
