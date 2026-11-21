import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import vm from 'node:vm'

/* data/filemanager1.js answers org.freedesktop.FileManager1 on the session bus
 * and turns each call into a `mariner` command line. The strings in a call come
 * from whoever made it, and `mariner` reads a first argument such as
 * --uninstall-desktop-entry as an option. Only a URI may reach the command
 * line.
 *
 * The script is written for gjs. Here it runs in a vm context whose `imports.gi`
 * records the command it would have started, so the real file is under test
 * with no bus and no process. */

const source = readFileSync(new URL('../data/filemanager1.js', import.meta.url), 'utf8')

type Methods = Record<string, (uris: string[], startupId: string) => void>

function loadService(): { methods: Methods; spawned: string[][] } {
  const spawned: string[][] = []
  const captured: { methods: Methods | null } = { methods: null }
  const GLib = {
    getenv: () => null,
    shell_parse_argv: (line: string) => [true, line.split(' ')],
    get_environ: () => [],
    environ_setenv: (env: string[], key: string, value: string) => [...env, `${key}=${value}`],
    spawn_async: (_cwd: unknown, argv: string[]) => {
      spawned.push([...argv])
    },
    SpawnFlags: { SEARCH_PATH: 4 },
    MainLoop: class {
      run(): void {}
      quit(): void {}
    },
  }
  const Gio = {
    BusType: { SESSION: 2 },
    BusNameOwnerFlags: { NONE: 0 },
    DBusExportedObject: {
      wrapJSObject: (_xml: string, object: Methods) => {
        captured.methods = object
        return { export: () => {} }
      },
    },
    bus_own_name: (_bus: number, _name: string, _flags: number, acquired: (c: unknown) => void) =>
      acquired({}),
  }
  vm.runInNewContext(source, { imports: { gi: { GLib, Gio } }, logError: () => {} })
  if (!captured.methods) throw new Error('filemanager1.js exported no object')
  return { methods: captured.methods, spawned }
}

/* Each of these is an option to `mariner`, or would be read as a path. */
const NOT_URIS = [
  '--uninstall-desktop-entry',
  '--install-desktop-entry',
  '--select',
  '-x',
  '/home/user',
  '',
  ':no-scheme',
]
const URIS = ['file:///home/user/Documents', 'trash:///', 'sftp://host/srv']

describe('org.freedesktop.FileManager1 shim', () => {
  test('ShowFolders starts mariner with the URIs it was given', () => {
    const { methods, spawned } = loadService()
    methods.ShowFolders(URIS, '')
    assert.deepEqual(spawned, [['mariner', ...URIS]])
  })

  test('ShowItems and ShowItemProperties put their own option first', () => {
    const { methods, spawned } = loadService()
    methods.ShowItems(URIS, '')
    methods.ShowItemProperties(URIS, '')
    assert.deepEqual(spawned, [
      ['mariner', '--select', ...URIS],
      ['mariner', '--properties', ...URIS],
    ])
  })

  for (const name of ['ShowFolders', 'ShowItems', 'ShowItemProperties']) {
    test(`${name} starts nothing for strings that are not URIs`, () => {
      const { methods, spawned } = loadService()
      methods[name](NOT_URIS, '')
      assert.deepEqual(spawned, [])
    })

    test(`${name} drops a string that is not a URI and keeps the rest`, () => {
      const { methods, spawned } = loadService()
      methods[name](['--uninstall-desktop-entry', URIS[0], '-x', URIS[1]], '')
      assert.equal(spawned.length, 1)
      const passed = spawned[0].filter((arg) => arg !== '--select' && arg !== '--properties')
      assert.deepEqual(passed, ['mariner', URIS[0], URIS[1]])
    })
  }
})
