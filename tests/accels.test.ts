import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { ACCELS, formatAccel, accelHint } from '../src/accels.ts'

describe('accels formatting', () => {
  test('formatAccel formats GTK accelerator strings to human-readable labels', () => {
    assert.equal(formatAccel('<ctrl>p'), 'Ctrl+P')
    assert.equal(formatAccel('<alt>Left'), 'Alt+←')
    assert.equal(formatAccel('<ctrl><shift>i'), 'Ctrl+Shift+I')
    assert.equal(formatAccel('F3'), 'F3')
    assert.equal(formatAccel('<ctrl>Return'), 'Ctrl+Enter')
  })

  test('accelHint returns formatted hint for registered action or undefined', () => {
    assert.equal(accelHint('win.command-palette'), 'Ctrl+P')
    assert.equal(accelHint('win.nonexistent'), undefined)
  })
})
