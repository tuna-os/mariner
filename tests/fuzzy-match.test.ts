import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { fuzzyMatch, fuzzyMatchPrepared, prepare } from '../src/core/fuzzy-match.ts'

describe('fuzzyMatch', () => {
  test('matches case-insensitively and returns ordered positions', () => {
    const match = fuzzyMatch('mnr', 'Mariner')

    assert.deepEqual(match?.positions, [0, 4, 6])
  })

  test('uses smartcase for uppercase queries', () => {
    assert.equal(fuzzyMatch('MR', 'Mariner'), null)
    assert.notEqual(fuzzyMatch('MR', 'MARINER'), null)
    assert.notEqual(fuzzyMatch('MR', 'Mariner', { smartcase: false }), null)
  })

  test('allows a bounded number of query typos', () => {
    assert.equal(fuzzyMatch('marxiner', 'mariner'), null)
    assert.notEqual(fuzzyMatch('marxiner', 'mariner', { maxTypos: 1 }), null)
  })

  test('reuses prepared candidates without changing results', () => {
    const text = '/home/user/Documents/report.pdf'
    const direct = fuzzyMatch('report', text, { boostFrom: 21 })
    const prepared = fuzzyMatchPrepared('report', prepare(text), false, 21)

    assert.deepEqual(prepared, direct)
  })

  test('handles empty and impossible queries', () => {
    assert.deepEqual(fuzzyMatch('', 'anything'), { score: 0, positions: [] })
    assert.equal(fuzzyMatch('xyz', 'mariner'), null)
  })

  test('maxTypos above one tolerates that many stray query characters', () => {
    assert.equal(fuzzyMatch('mxarxiner', 'mariner', { maxTypos: 1 }), null)
    const match = fuzzyMatch('mxarxiner', 'mariner', { maxTypos: 2 })

    assert.deepEqual(match?.positions, [0, 1, 2, 3, 4, 5, 6])
  })

  test('a colon starts a word, so a match right after it outscores one inside a word', () => {
    const afterColon = fuzzyMatch('c', 'agent:continue')
    const insideWord = fuzzyMatch('c', 'agentxcontinue')

    assert.deepEqual(afterColon?.positions, [6])
    assert.deepEqual(insideWord?.positions, [6])
    assert.ok(afterColon!.score > insideWord!.score)
  })
})
