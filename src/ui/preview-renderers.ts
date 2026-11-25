import { open } from 'node:fs/promises'
import Adw from 'gi:Adw-1'
import GLib from 'gi:GLib-2.0'
import Gdk from 'gi:Gdk-4.0'
import Gtk from 'gi:Gtk-4.0'
import { displayName, formatModified, formatSize, formatType, isDirectory } from '../core/format.ts'
import { escapeMarkup } from '../core/markup.ts'
import { MAX_RICH_BYTES, renderRich, richKind } from '../core/rich-text.ts'
import type { GFile, GFileInfo } from '../core/types.ts'

/* Per-content-type preview builders for Quick Look. Each returns a widget
 * synchronously; text renderers fill in asynchronously so a large file never
 * blocks. Pure UI — no app state. */

const MAX_TEXT_BYTES = 512 * 1024

/* content-types we render as plain text (beyond everything under text/*). */
const TEXT_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-shellscript',
  'application/x-desktop',
  'application/toml',
  'application/x-yaml',
  'application/yaml',
  'application/sql',
])

function isTextType(ct: string): boolean {
  return ct.startsWith('text/') || TEXT_TYPES.has(ct) || ct.endsWith('+xml') || ct.endsWith('+json')
}

/* Build a preview widget for one entry. */
export function renderPreview(info: GFileInfo, file: GFile): unknown {
  const ct = info.getContentType() || ''
  const path = file.getPath()

  if (!isDirectory(info) && ct.startsWith('image/')) return imagePreview(file)
  if (!isDirectory(info) && (ct.startsWith('video/') || ct.startsWith('audio/')))
    return mediaPreview(file)
  const rich = !isDirectory(info) && path ? richKind(ct, path) : null
  if (rich && path) return richPreview(path, rich)
  if (!isDirectory(info) && path && isTextType(ct)) return textPreview(path)
  return metadataCard(info, file)
}

function imagePreview(file: GFile): unknown {
  const pic = new Gtk.Picture({ hexpand: true, vexpand: true, canShrink: true })
  pic.setContentFit(Gtk.ContentFit.CONTAIN)
  try {
    pic.setFile(file)
  } catch {
    /* unreadable — leave blank */
  }
  pic.addCssClass('preview-image')
  return pic
}

function mediaPreview(file: GFile): unknown {
  const video = Gtk.Video.newForFile(file)
  video.setAutoplay(false)
  video.setHexpand(true)
  video.setVexpand(true)
  return video
}

/* Links open only on an explicit click, and only the schemes toPango emitted
 * (http, https, mailto). Returning true stops GTK's default handler. */
function openLink(uri: string): boolean {
  if (/^(https?:\/\/|mailto:)/i.test(uri)) {
    try {
      Gtk.showUri(null, uri, Gdk.CURRENT_TIME)
    } catch {
      /* no handler */
    }
  }
  return true
}

/* Rendered Markdown/HTML with a "Source" toggle for the raw text. The file is
 * read once (bounded); nothing is fetched. On any failure or oversize input the
 * view falls back to raw text with an explicit notice. */
function richPreview(path: string, kind: 'markdown' | 'html'): unknown {
  const raw = textPreview(path)
  const label = new Gtk.Label({
    useMarkup: true,
    wrap: true,
    selectable: true,
    xalign: 0,
    yalign: 0,
    hexpand: true,
    vexpand: true,
    label: 'Loading…',
  })
  label.setMarginStart(16)
  label.setMarginEnd(16)
  label.setMarginTop(12)
  label.setMarginBottom(12)
  label.on('activate-link', (uri: string) => openLink(String(uri)))
  const rendered = new Gtk.ScrolledWindow({ child: label, hexpand: true, vexpand: true })

  const stack = new Gtk.Stack({ hexpand: true, vexpand: true })
  stack.addNamed(rendered, 'rendered')
  stack.addNamed(raw, 'raw')
  const toggle = new Gtk.ToggleButton({
    label: 'Source',
    halign: Gtk.Align.END,
    valign: Gtk.Align.START,
  })
  toggle.setMargin?.(6)
  toggle.on('toggled', () => stack.setVisibleChildName(toggle.getActive() ? 'raw' : 'rendered'))
  const overlay = new Gtk.Overlay({ child: stack })
  overlay.addOverlay(toggle)

  const fallback = (why: string) => {
    GLib.idleAdd(GLib.PRIORITY_DEFAULT, () => {
      label.setUseMarkup(false)
      label.setLabel(why)
      stack.setVisibleChildName('raw')
      toggle.setActive(true)
      return false
    })
  }
  readBounded(path, MAX_RICH_BYTES)
    .then(({ text, truncated }) => {
      let markup = ''
      let partial = truncated
      try {
        const r = renderRich(kind, text)
        markup = r.markup
        partial = partial || r.truncated
      } catch {
        return fallback('This file could not be rendered; showing raw text.')
      }
      if (!markup.trim()) return fallback('Nothing to render; showing raw text.')
      GLib.idleAdd(GLib.PRIORITY_DEFAULT, () => {
        try {
          label.setLabel(
            markup + (partial ? '\n\n<i>… (preview truncated — use Source for raw text)</i>' : ''),
          )
        } catch {
          label.setUseMarkup(false)
          label.setLabel('This file could not be rendered; showing raw text.')
          stack.setVisibleChildName('raw')
        }
        return false
      })
    })
    .catch(() => fallback('This file could not be read.'))
  return overlay
}

function textPreview(path: string): unknown {
  const buffer = new Gtk.TextBuffer()
  const tv = new Gtk.TextView({
    buffer,
    editable: false,
    monospace: true,
    cursorVisible: false,
    hexpand: true,
    vexpand: true,
  })
  tv.setWrapMode(Gtk.WrapMode.NONE)
  tv.setLeftMargin(12)
  tv.setRightMargin(12)
  tv.setTopMargin(8)
  tv.setBottomMargin(8)
  const scroller = new Gtk.ScrolledWindow({ child: tv, hexpand: true, vexpand: true })

  /* Bounded async read on the node side; hop back onto the GLib loop to touch
   * the buffer (node-gtk widgets must be mutated on the main loop). */
  readBounded(path)
    .then(({ text, truncated }) => {
      GLib.idleAdd(GLib.PRIORITY_DEFAULT, () => {
        buffer.setText(text + (truncated ? '\n\n… (truncated)' : ''), -1)
        return false
      })
    })
    .catch(() => {})
  return scroller
}

async function readBounded(
  path: string,
  max = MAX_TEXT_BYTES,
): Promise<{ text: string; truncated: boolean }> {
  const fh = await open(path, 'r')
  try {
    const buf = Buffer.alloc(max)
    const { bytesRead } = await fh.read(buf, 0, max, 0)
    return {
      text: buf.subarray(0, bytesRead).toString('utf8'),
      truncated: bytesRead >= max,
    }
  } finally {
    await fh.close()
  }
}

function metadataCard(info: GFileInfo, file: GFile): unknown {
  const page = new Adw.StatusPage({ title: displayName(info), hexpand: true, vexpand: true })
  const paintable = iconPaintable(info.getIcon?.())
  if (paintable) page.setPaintable(paintable)
  else page.setIconName(isDirectory(info) ? 'folder-symbolic' : 'text-x-generic-symbolic')
  const parts = [formatType(info)]
  if (!isDirectory(info)) parts.push(formatSize(info))
  const mod = formatModified(info)
  if (mod) parts.push(mod)
  const path = file.getPath()
  page.setDescription(escapeMarkup(parts.filter(Boolean).join(' · ') + (path ? `\n${path}` : '')))
  return page
}

/* A GdkPaintable for a GIcon at a comfortable preview size, or null. */
function iconPaintable(icon: unknown): unknown {
  if (!icon) return null
  const display = Gdk.Display.getDefault()
  if (!display) return null
  try {
    const theme = Gtk.IconTheme.getForDisplay(display)
    return theme.lookupByGicon(icon, 128, 1, Gtk.TextDirection.NONE, 0)
  } catch {
    return null
  }
}
