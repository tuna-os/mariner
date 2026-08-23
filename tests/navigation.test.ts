import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { History } from '../src/core/navigation.ts'
import type { GFile } from '../src/core/types.ts'

const location = (name: string): GFile => ({ name }) as unknown as GFile

describe('History', () => {
  test('moves through back and forward stacks', () => {
    const history = new History()
    const home = location('home')
    const docs = location('docs')
    const photos = location('photos')

    history.visit(home)
    history.visit(docs)
    assert.equal(history.goBack(photos), docs)
    assert.equal(history.goBack(docs), home)
    assert.equal(history.goForward(home), docs)
    assert.equal(history.canGoBack, true)
    assert.equal(history.canGoForward, true)
  })

  test('a new visit clears forward history and null visits are ignored', () => {
    const history = new History()
    const home = location('home')
    const docs = location('docs')

    history.visit(home)
    assert.equal(history.goBack(docs), home)
    history.visit(null)
    assert.equal(history.canGoForward, true)
    history.visit(docs)
    assert.equal(history.canGoForward, false)
  })

  test('returns null at either end of empty history', () => {
    const history = new History()
    const home = location('home')

    assert.equal(history.goBack(home), null)
    assert.equal(history.goForward(home), null)
  })
})
