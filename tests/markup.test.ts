import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { escapeMarkup } from '../src/core/markup.ts'

/* Names come from the filesystem (an archive, a USB stick, a download). Each
 * of these is markup to Pango unless it is escaped first. */
const HOSTILE = [
  '<a href="https:example.org">Open Downloads</a>',
  '<span size="1">x</span>',
  "<b title='x'>report</b>.pdf",
  'R&D <draft>.txt',
  '&lt;already escaped&gt;',
]

/* What the markup parser hands back as text once the entities are resolved.
 * `&amp;` goes last so an escaped `&lt;` does not turn back into `<`. */
function parsedText(markup: string): string {
  return markup
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&apos;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
}

describe('escapeMarkup', () => {
  for (const name of HOSTILE) {
    test(`${JSON.stringify(name)} carries no markup and reads back unchanged`, () => {
      const escaped = escapeMarkup(name)
      assert.doesNotMatch(escaped, /[<>'"]/, 'a tag or attribute delimiter survived')
      assert.doesNotMatch(escaped, /&(?!(amp|lt|gt|apos|quot);)/, 'a bare & survived')
      assert.equal(parsedText(escaped), name)
    })
  }

  test('ordinary names are left alone', () => {
    assert.equal(escapeMarkup('Holiday photos (2026).tar.gz'), 'Holiday photos (2026).tar.gz')
  })
})
