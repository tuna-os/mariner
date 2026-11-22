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

  test('undo and redo on empty stacks do nothing and emit no change', () => {
    const service = new UndoService()
    let changes = 0
    service.on('changed', () => changes++)

    service.undo()
    service.redo()

    assert.equal(changes, 0)
    assert.equal(service.canUndo, false)
    assert.equal(service.canRedo, false)
  })

  test('labels fall back to plain Undo and Redo when there is nothing to replay', () => {
    const service = new UndoService()
    assert.equal(service.undoLabel, 'Undo')
    assert.equal(service.redoLabel, 'Redo')

    service.push({ undo() {}, redo() {}, undoLabel: 'Undo Copy', redoLabel: 'Redo Copy' })
    service.undo()
    service.redo()

    assert.equal(service.redoLabel, 'Redo')
  })

  test('entries replay last in, first out and redo returns them in the same order', () => {
    const service = new UndoService()
    const calls: string[] = []
    for (const name of ['a', 'b']) {
      service.push({
        undo: () => calls.push(`undo ${name}`),
        redo: () => calls.push(`redo ${name}`),
        undoLabel: `Undo ${name}`,
        redoLabel: `Redo ${name}`,
      })
    }

    service.undo()
    service.undo()
    assert.equal(service.redoLabel, 'Redo a')
    service.redo()
    service.redo()

    assert.deepEqual(calls, ['undo b', 'undo a', 'redo a', 'redo b'])
  })
})
