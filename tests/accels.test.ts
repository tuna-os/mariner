import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { accelHint, formatAccel } from '../src/accels.ts'

describe('formatAccel', () => {
  test('renders modifiers and single-character keys', () => {
    assert.equal(formatAccel('<ctrl>p'), 'Ctrl+P')
    assert.equal(formatAccel('<primary><shift>i'), 'Ctrl+Shift+I')
    assert.equal(formatAccel('<super><alt>x'), 'Super+Alt+X')
  })

  test('renders named, navigation, and punctuation keys', () => {
    assert.equal(formatAccel('<alt>Left'), 'Alt+←')
    assert.equal(formatAccel('<ctrl>Page_Down'), 'Ctrl+Page Down')
    assert.equal(formatAccel('<ctrl>Return'), 'Ctrl+Enter')
    assert.equal(formatAccel('<ctrl>plus'), 'Ctrl++')
  })

  test('preserves function keys and unknown modifiers', () => {
    assert.equal(formatAccel('F5'), 'F5')
    assert.equal(formatAccel('<hyper>Tab'), 'hyper+Tab')
  })
})

describe('accelHint', () => {
  test('formats the primary accelerator for known actions', () => {
    assert.equal(accelHint('win.reload'), 'Ctrl+R')
    assert.equal(accelHint('win.up'), 'Alt+↑')
  })

  test('returns undefined for actions without accelerators', () => {
    assert.equal(accelHint('win.does-not-exist'), undefined)
  })
})
