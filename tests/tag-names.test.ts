import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  MAX_DISCOVERED_TAGS,
  MAX_TAGS_PER_FILE,
  MAX_TAG_NAME,
  tagNamesFromXattr,
  validateTagName,
} from '../src/core/tag-names.ts'

const none = () => false
const ROOM = MAX_DISCOVERED_TAGS

describe('validateTagName', () => {
  test('trims, and refuses empty, comma and over-long names', () => {
    assert.equal(validateTagName('  Work '), 'Work')
    assert.equal(validateTagName('   '), null)
    assert.equal(validateTagName('a,b'), null)
    assert.equal(validateTagName('x'.repeat(MAX_TAG_NAME)), 'x'.repeat(MAX_TAG_NAME))
    assert.equal(validateTagName('x'.repeat(MAX_TAG_NAME + 1)), null)
  })
})

/* The value comes from a file's user.xdg.tags xattr, which anyone who can
 * write the file controls. */
describe('tagNamesFromXattr', () => {
  test('reads a list another file manager wrote', () => {
    assert.deepEqual(tagNamesFromXattr('Work, Pink ,Travel', none, ROOM), [
      'Work',
      'Pink',
      'Travel',
    ])
    assert.deepEqual(tagNamesFromXattr('', none, ROOM), [])
    assert.deepEqual(tagNamesFromXattr(null, none, ROOM), [])
    assert.deepEqual(tagNamesFromXattr(' , ,', none, ROOM), [])
  })

  test('one file gives at most MAX_TAGS_PER_FILE names', () => {
    const many = Array.from({ length: 5000 }, (_, i) => `t${i}`)
    const got = tagNamesFromXattr(many.join(','), none, ROOM)
    assert.deepEqual(got, many.slice(0, MAX_TAGS_PER_FILE))
  })

  test('skips a name that is too long, repeated, or holds a control character', () => {
    const long = 'x'.repeat(MAX_TAG_NAME + 1)
    assert.deepEqual(
      tagNamesFromXattr(`a,${long},a,two\nlines,tab\there,del\u007f,b`, none, ROOM),
      ['a', 'b'],
    )
  })

  test('a name the registry does not know is taken only while room is left', () => {
    const known = (name: string) => name === 'Pink'
    assert.deepEqual(tagNamesFromXattr('n1,Pink,n2,n3', known, 2), ['n1', 'Pink', 'n2'])
    assert.deepEqual(tagNamesFromXattr('n1,Pink,n2', known, 0), ['Pink'])
    assert.deepEqual(tagNamesFromXattr('n1,Pink,n2', known, -7), ['Pink'])
  })

  test('skipped names do not use up the per-file limit', () => {
    const junk = Array.from({ length: 100 }, () => 'bad\u0001')
    assert.deepEqual(tagNamesFromXattr([...junk, 'ok'].join(','), none, ROOM), ['ok'])
  })
})
