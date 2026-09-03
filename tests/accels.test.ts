import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ACCELS, accelHint, formatAccel } from '../src/accels.ts'

describe('ACCELS', () => {
  test('defines valid accelerator mappings', () => {
    assert.ok(typeof ACCELS === 'object' && ACCELS !== null)
    assert.ok(Object.keys(ACCELS).length > 0)
    for (const [action, keys] of Object.entries(ACCELS)) {
      assert.ok(action.startsWith('win.'))
      assert.ok(Array.isArray(keys))
      assert.ok(keys.length > 0)
    }
  })
})

describe('formatAccel', () => {
  test('renders modifiers and single-character keys', () => {
    assert.equal(formatAccel('<ctrl>p'), 'Ctrl+P')
    assert.equal(formatAccel('<primary><shift>i'), 'Ctrl+Shift+I')
    assert.equal(formatAccel('<super><alt>x'), 'Super+Alt+X')
    assert.equal(formatAccel('<meta>a'), 'Meta+A')
  })

  test('renders named, navigation, and punctuation keys', () => {
    assert.equal(formatAccel('<alt>Left'), 'Alt+←')
    assert.equal(formatAccel('<alt>Right'), 'Alt+→')
    assert.equal(formatAccel('<alt>Up'), 'Alt+↑')
    assert.equal(formatAccel('<alt>Down'), 'Alt+↓')
    assert.equal(formatAccel('<ctrl>Return'), 'Ctrl+Enter')
    assert.equal(formatAccel('<ctrl>space'), 'Ctrl+Space')
    assert.equal(formatAccel('<ctrl>plus'), 'Ctrl++')
    assert.equal(formatAccel('<ctrl>equal'), 'Ctrl+=')
    assert.equal(formatAccel('<ctrl>minus'), 'Ctrl+−')
    assert.equal(formatAccel('<ctrl>comma'), 'Ctrl+,')
    assert.equal(formatAccel('<ctrl>period'), 'Ctrl+.')
    assert.equal(formatAccel('<ctrl>question'), 'Ctrl+?')
    assert.equal(formatAccel('<ctrl>slash'), 'Ctrl+/')
    assert.equal(formatAccel('<ctrl>Page_Up'), 'Ctrl+Page Up')
    assert.equal(formatAccel('<ctrl>Page_Down'), 'Ctrl+Page Down')
    assert.equal(formatAccel('<alt>Home'), 'Alt+Home')
    assert.equal(formatAccel('Delete'), 'Del')
    assert.equal(formatAccel('<shift>Delete'), 'Shift+Del')
  })

  test('preserves function keys, custom words, and unknown modifiers', () => {
    assert.equal(formatAccel('F2'), 'F2')
    assert.equal(formatAccel('F3'), 'F3')
    assert.equal(formatAccel('F5'), 'F5')
    assert.equal(formatAccel('F6'), 'F6')
    assert.equal(formatAccel('<hyper>Tab'), 'hyper+Tab')
    assert.equal(formatAccel('Escape'), 'Escape')
  })
})

describe('accelHint', () => {
  test('formats the primary accelerator for known actions', () => {
    assert.equal(accelHint('win.reload'), 'Ctrl+R')
    assert.equal(accelHint('win.up'), 'Alt+↑')
    assert.equal(accelHint('win.command-palette'), 'Ctrl+P')
    assert.equal(accelHint('win.shortcuts'), 'Ctrl+?')
    assert.equal(accelHint('win.zoom-in'), 'Ctrl++')
  })

  test('returns undefined for actions without accelerators', () => {
    assert.equal(accelHint('win.non-existent-action'), undefined)
    assert.equal(accelHint(''), undefined)
  })
})
