/* Tag-name rules. Pure (no GTK), so tests/ can import it. */

/* Longest tag name, in UTF-16 code units. */
export const MAX_TAG_NAME = 64
/* Most tags read from one file's xattr. */
export const MAX_TAGS_PER_FILE = 32
/* Once the registry holds this many tags, a name found in an xattr no longer
 * creates one. Creating a tag in Mariner itself is not limited by it. */
export const MAX_DISCOVERED_TAGS = 500

/* Tag names separate on commas in the xattr, so they can't contain one. */
export function validateTagName(name: string): string | null {
  const n = name.trim()
  if (!n) return null
  if (n.includes(',')) return null
  if (n.length > MAX_TAG_NAME) return null
  return n
}

/* The tag names in a `user.xdg.tags` value read from a file.
 *
 * The value is untrusted: any program, another user or whoever prepared a
 * removable disk can write it, and one value can hold thousands of names.
 * Every new name becomes a registry row that is kept on disk and shown in the
 * sidebar, the menus and the Tags page, so a folder that is only browsed could
 * fill all of them for good. Hence the limits: names obey validateTagName and
 * hold no control character, a file gives at most MAX_TAGS_PER_FILE names, and
 * a name the registry does not know yet is taken only while `room` is left.
 *
 * `known` says whether the registry already has a name; `room` is how many new
 * names it may still take. Names that fail a limit are skipped, not reported. */
export function tagNamesFromXattr(
  raw: string | null | undefined,
  known: (name: string) => boolean,
  room: number,
): string[] {
  if (!raw) return []
  let left = room
  const out: string[] = []
  for (const part of raw.split(',')) {
    if (out.length >= MAX_TAGS_PER_FILE) break
    const name = validateTagName(part)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what this rejects
    if (!name || /[\u0000-\u001f\u007f]/.test(name) || out.includes(name)) continue
    if (!known(name)) {
      if (left <= 0) continue
      left--
    }
    out.push(name)
  }
  return out
}
