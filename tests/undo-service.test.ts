import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { UndoService } from '../src/services/undo-service.ts'

describe('UndoService', () => {
  test('undoes and redoes the latest entry while updating labels', () => {
    const service = new UndoService()
    const calls: string[] = []
    let changes = 0
    service.on('changed', () => changes++)

    service.push({
      undo: () => calls.push('undo'),
      redo: () => calls.push('redo'),
      undoLabel: 'Undo Rename',
      redoLabel: 'Redo Rename',
    })
    assert.equal(service.undoLabel, 'Undo Rename')
    service.undo()
    assert.deepEqual(calls, ['undo'])
    assert.equal(service.redoLabel, 'Redo Rename')
    service.redo()
    assert.deepEqual(calls, ['undo', 'redo'])
    assert.equal(changes, 3)
  })

  test('pushing after undo discards redo history', () => {
    const service = new UndoService()
    const entry = (label: string) => ({
      undo() {}, redo() {}, undoLabel: `Undo ${label}`, redoLabel: `Redo ${label}`,
    })

    service.push(entry('first'))
    service.undo()
    service.push(entry('second'))
    assert.equal(service.canRedo, false)
    assert.equal(service.undoLabel, 'Undo second')
  })

  test('clear resets both stacks and emits a change', () => {
    const service = new UndoService()
    let changes = 0
    service.on('changed', () => changes++)
    service.push({ undo() {}, redo() {}, undoLabel: 'Undo', redoLabel: 'Redo' })
    service.undo()
    service.clear()

    assert.equal(service.canUndo, false)
    assert.equal(service.canRedo, false)
    assert.equal(changes, 3)
  })
})
