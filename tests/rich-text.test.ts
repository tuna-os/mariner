import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  MAX_BLOCKS,
  parseHtml,
  parseMarkdown,
  renderRich,
  richKind,
  safeHref,
} from '../src/core/rich-text.ts'

const md = (s: string) => renderRich('markdown', s).markup
const html = (s: string) => renderRich('html', s).markup

describe('richKind', () => {
  test('by content type and extension', () => {
    assert.equal(richKind('text/markdown', null), 'markdown')
    assert.equal(richKind('text/plain', '/a/README.MD'), 'markdown')
    assert.equal(richKind('text/html', null), 'html')
    assert.equal(richKind('text/plain', '/a/x.txt'), null)
  })
})

describe('safeHref', () => {
  test('allows only http(s) and mailto', () => {
    assert.equal(safeHref('https://example.org/a'), 'https://example.org/a')
    assert.equal(safeHref('mailto:a@b.c'), 'mailto:a@b.c')
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'file:///etc/passwd',
      '//evil.test/x',
      'rel/path',
      'https://a b',
      ' java\tscript:x',
    ]) {
      assert.equal(safeHref(bad), undefined, bad)
    }
  })
})

describe('markdown', () => {
  test('headings, lists, emphasis, links', () => {
    const out = md(
      '# Title\n\nSome **bold** and *it* and `c`.\n\n- one\n- two\n\n1. a\n\n[site](https://example.org)',
    )
    assert.match(out, /<span size="xx-large" weight="bold">Title<\/span>/)
    assert.match(out, /<b>bold<\/b>/)
    assert.match(out, /<i>it<\/i>/)
    assert.match(out, /<tt>c<\/tt>/)
    assert.match(out, /• one\n• two/)
    assert.match(out, /1\. a/)
    assert.match(out, /<a href="https:\/\/example.org">site<\/a>/)
  })
  test('hostile links and images are inert text', () => {
    const out = md(
      '[x](javascript:alert(1)) ![pic](https://track.test/p.png) <script>alert(1)</script>',
    )
    assert.doesNotMatch(out, /href="javascript/)
    assert.doesNotMatch(out, /track\.test/)
    assert.match(out, /\[image: pic\]/)
    assert.doesNotMatch(out, /<script/)
    assert.match(out, /&lt;script&gt;/)
  })
  test('code fences are literal and escaped', () => {
    const out = md('```\n<b>x</b> **y**\n```')
    assert.match(out, /<tt>&lt;b&gt;x&lt;\/b&gt; \*\*y\*\*<\/tt>/)
  })
  test('unterminated constructs do not throw', () => {
    for (const s of ['**open', '[a](', '```\nnever closed', '*', '![', '<', '`', '_x', '\\']) {
      assert.doesNotThrow(() => md(s), s)
    }
  })
  test('block count is bounded and reported', () => {
    const doc = parseMarkdown('- x\n'.repeat(MAX_BLOCKS + 50))
    assert.equal(doc.blocks.length, MAX_BLOCKS)
    assert.equal(doc.truncated, true)
  })
})

describe('html', () => {
  test('readable formatting', () => {
    const out = html(
      '<h2>Hi</h2><p>a <b>b</b> <em>c</em> <a href="https://example.org">l</a></p><ul><li>x</li><li>y</li></ul>',
    )
    assert.match(out, /size="x-large"/)
    assert.match(out, /<b>b<\/b>/)
    assert.match(out, /<i>c<\/i>/)
    assert.match(out, /<a href="https:\/\/example.org">l<\/a>/)
    assert.match(out, /• x\n• y/)
  })
  test('active and remote content is dropped', () => {
    const out = html(
      '<p>ok</p><script>alert(1)</script><style>@import url(https://t.test/x)</style>' +
        '<iframe src="https://t.test/f">fallback</iframe><img src="https://t.test/p.png" alt="pic">' +
        '<link rel=stylesheet href="https://t.test/s.css"><object data="x">o</object>' +
        '<a href="javascript:alert(1)" onclick="x()">bad</a><svg><script>1</script></svg>',
    )
    assert.doesNotMatch(out, /t\.test|alert|fallback|onclick|javascript/)
    assert.match(out, /ok/)
    assert.match(out, /\[image: pic\]/)
    assert.match(out, /bad/)
    assert.doesNotMatch(out, /<a /)
  })
  test('text is escaped and entities decoded', () => {
    const out = html('<p>&lt;b&gt; &amp; &#60;i&#62; &#x110000; &bogus;</p>')
    assert.match(out, /&lt;b&gt; &amp; &lt;i&gt;/)
    assert.doesNotMatch(out, /<b>|<i>/)
  })
  test('malformed input does not throw', () => {
    for (const s of [
      '<',
      '<a href="x',
      '<p',
      '<script>never closed',
      '</b></b></a>',
      '<!-- open',
      '<ul><li><ul><li>',
      '<h1>x</h2>',
    ]) {
      assert.doesNotThrow(() => parseHtml(s), s)
    }
  })
  test('control characters are stripped from output', () => {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting control characters are gone
    assert.doesNotMatch(html('<p>a\u0001b\u0000c</p>'), /[\u0000-\u0008]/)
  })
})
