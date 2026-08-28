import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { formatAccel, accelHint, ACCELS } from '../src/accels.ts'

describe('accels helpers', () => {
  test('formatAccel converts GTK accelerator strings to human-readable labels', () => {
    assert.equal(formatAccel('<ctrl>p'), 'Ctrl+P')
    assert.equal(formatAccel('<alt>Left'), 'Alt+←')
    assert.equal(formatAccel('<ctrl><shift>i'), 'Ctrl+Shift+I')
    assert.equal(formatAccel('<ctrl>Return'), 'Ctrl+Enter')
    assert.equal(formatAccel('<ctrl>comma'), 'Ctrl+,')
    assert.equal(formatAccel('<ctrl>question'), 'Ctrl+?')
  })

  test('accelHint returns the formatted first accelerator for registered actions', () => {
    assert.equal(accelHint('win.command-palette'), 'Ctrl+P')
    assert.equal(accelHint('win.back'), 'Alt+←')
    assert.equal(accelHint('nonexistent-action'), undefined)
  })

  test('ACCELS mapping contains valid keyboard shortcut arrays', () => {
    assert.ok(Array.isArray(ACCELS['win.new-tab']))
    assert.equal(ACCELS['win.new-tab'][0], '<ctrl>t')
  })
})
