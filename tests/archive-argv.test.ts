import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { compressArgv } from '../src/core/archive-argv.ts'

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
