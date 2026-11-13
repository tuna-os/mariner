import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { globMatcher, globToRegExp } from '../src/core/glob.ts'

describe('globToRegExp', () => {
  test('empty and whitespace-only patterns compile to null', () => {
    assert.equal(globToRegExp(''), null)
    assert.equal(globToRegExp('   '), null)
  })

  test('surrounding whitespace is trimmed', () => {
    const re = globToRegExp('  a*  ')
    assert.ok(re)
    assert.ok(re.test('abc'))
  })
})

describe('globMatcher', () => {
  test('* matches any run, including an empty one', () => {
    const match = globMatcher('*.png')
    assert.equal(match('photo.png'), true)
    assert.equal(match('.png'), true)
    assert.equal(match('photo.jpg'), false)
  })

  test('? matches exactly one character', () => {
    const match = globMatcher('file?.txt')
    assert.equal(match('file1.txt'), true)
    assert.equal(match('file.txt'), false)
    assert.equal(match('file12.txt'), false)
  })

  test('matching is case-insensitive', () => {
    assert.equal(globMatcher('*.png')('PHOTO.PNG'), true)
  })

  test('the whole name must match', () => {
    const match = globMatcher('*.txt')
    assert.equal(match('notes.txt'), true)
    assert.equal(match('txt.old'), false)
    assert.equal(match('notes.txt.bak'), false)
  })

  test('regex metacharacters are matched literally', () => {
    assert.equal(globMatcher('a.b')('a.b'), true)
    assert.equal(globMatcher('a.b')('axb'), false)
    assert.equal(globMatcher('(x)+[y]')('(x)+[y]'), true)
    assert.equal(globMatcher('$^{1}|\\')('$^{1}|\\'), true)
    assert.equal(globMatcher('a+')('aa'), false)
  })

  test('an empty pattern rejects every name', () => {
    const match = globMatcher('')
    assert.equal(match(''), false)
    assert.equal(match('anything'), false)
  })

  test('a lone * matches every name', () => {
    assert.equal(globMatcher('*')('whatever'), true)
  })
})
