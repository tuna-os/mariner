import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

/* Copy, Move and Restore must handle a symbolic link as a link. gio does the
 * opposite unless it is told otherwise: g_file_copy and g_file_move without
 * G_FILE_COPY_NOFOLLOW_SYMLINKS copy whatever the link points to. A link in a
 * folder that came from someone else then becomes a copy of the user's own
 * file it names, and a link to a directory fails the job.
 *
 * src/services/file-operations.ts imports gi: modules, so its behaviour only
 * runs where node-gtk is built. This suite reads the source instead, so the
 * flag cannot be dropped from a call without a test failing in the job that
 * runs everywhere. */

const source = readFileSync(new URL('../src/services/file-operations.ts', import.meta.url), 'utf8')

/* Calls on a GFile: `x.copy(…)` / `x.move(…)`. The service's own `copy(` and
 * `move(` methods are declarations, with no receiver in front of them. */
const calls = source.split('\n').filter((line) => /\.(copy|move)\(/.test(line))

describe('file operations keep symbolic links as links', () => {
  test('the flags constant is NOFOLLOW_SYMLINKS', () => {
    assert.match(source, /^const COPY_FLAGS = Gio\.FileCopyFlags\.NOFOLLOW_SYMLINKS$/m)
  })

  test('the copy step and the move step are among the calls found', () => {
    assert.ok(calls.some((line) => line.includes('src.copy(dest,')))
    assert.ok(calls.some((line) => line.includes('src.move(dest,')))
  })

  test('every g_file_copy and g_file_move call passes the constant', () => {
    for (const line of calls)
      assert.match(line, /, COPY_FLAGS, null, null\)/, `flags missing in: ${line.trim()}`)
  })
})
