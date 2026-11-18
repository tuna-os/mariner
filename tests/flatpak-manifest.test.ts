import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

/* The Flatpak carries its own `7z`, and Mariner runs it on archives from
 * anywhere ("Extract Here", and the listing before it). The module used to
 * build p7zip 17.05, whose code base stops at 7-Zip 21: it creates symbolic
 * links that point outside the extraction folder. 7-Zip refuses those from
 * 25.01 on ("Dangerous link path was ignored"), so that release is the floor. */

interface Source {
  url?: string
  sha256?: string
  'only-arches'?: string[]
}
interface Module {
  name: string
  'build-commands'?: string[]
  sources?: Source[]
}

const MIN_VERSION = [25, 1]
const RELEASE_URL = /^https:\/\/github\.com\/ip7z\/7zip\/releases\/download\/(\d+)\.(\d+)\//

const manifest = JSON.parse(
  readFileSync(new URL('../org.tunaos.mariner.json', import.meta.url), 'utf8'),
)
const sevenZip: Module | undefined = manifest.modules.find(
  (m: Module | string) => typeof m !== 'string' && m.name === '7z',
)

describe('Flatpak 7z module', () => {
  test('every source is an upstream 7-Zip release at 25.01 or newer', () => {
    assert.ok(sevenZip, 'the manifest has no "7z" module')
    const sources = sevenZip.sources ?? []
    assert.ok(sources.length > 0, 'the "7z" module has no sources')
    for (const source of sources) {
      const m = RELEASE_URL.exec(source.url ?? '')
      assert.ok(m, `not an ip7z/7zip release: ${source.url}`)
      const [major, minor] = [Number(m[1]), Number(m[2])]
      const newEnough =
        major > MIN_VERSION[0] || (major === MIN_VERSION[0] && minor >= MIN_VERSION[1])
      assert.ok(newEnough, `7-Zip ${m[1]}.${m[2]} is older than 25.01`)
      assert.match(source.sha256 ?? '', /^[0-9a-f]{64}$/, `no sha256 for ${source.url}`)
    }
  })

  test('both published architectures have a source', () => {
    const arches = (sevenZip?.sources ?? []).flatMap((s) => s['only-arches'] ?? [])
    assert.deepEqual(arches.sort(), ['aarch64', 'x86_64'])
  })

  test('the binary is installed under the name the archive service runs', () => {
    const commands = sevenZip?.['build-commands'] ?? []
    assert.ok(
      commands.some((c) => /\/app\/bin\/7z$/.test(c) && c.startsWith('install ')),
      `nothing installs /app/bin/7z: ${JSON.stringify(commands)}`,
    )
  })
})
