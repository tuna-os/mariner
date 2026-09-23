import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

/* Regression test for the memory-growth report (tuna-os/mariner#53): the
 * thumbnail cache held one texture per file browsed with no eviction, so RSS
 * climbed and never came back down. Needs the gi: modules (node-gtk);
 * skips where the runtime lacks them. */

let service: typeof import('../src/services/thumbnail-service.ts') | null = null
try {
  service = await import('../src/services/thumbnail-service.ts')
} catch {
  service = null
}

/* Never touches real thumbnails: drive _resolve directly with canned
 * textures (fully synchronous, no idle loop needed). Defined lazily so the
 * module still loads where gi: is unavailable (suite then skips). */
const Base: any = service?.ThumbnailService ?? class {}
class TestThumbs extends Base {
  _fromCache(_uri: string): any { return null }
  _generate(task: any): any { return { marker: task.key } }
}

const req = (key: string) => ({
  key,
  path: `/tmp/${key}.png`,
  uri: `file:///tmp/${key}.png`,
  contentType: 'image/png',
  bytes: 100,
})

describe('ThumbnailService cache bound', { skip: !service }, () => {
  test('evicts oldest entries past the cap', () => {
    const thumbs = new TestThumbs()
    for (let i = 0; i < 250; i++) thumbs._resolve(req(`k${i}`))
    assert.ok(thumbs._cache.size <= 200, `cache holds ${thumbs._cache.size} entries`)
    assert.equal(thumbs._cache.has('k0'), false)
    assert.equal(thumbs._cache.has('k249'), true)
  })

  test('a cache hit refreshes recency', () => {
    const thumbs = new TestThumbs()
    for (let i = 0; i < 200; i++) thumbs._resolve(req(`k${i}`))
    thumbs.request(req('k0'), () => {})
    thumbs._resolve(req('k200'))
    assert.equal(thumbs._cache.has('k0'), true)
    assert.equal(thumbs._cache.has('k1'), false)
  })
})
