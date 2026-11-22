# Tags

Tags are colored (or plain text) labels you attach to files, then browse from
the sidebar regardless of where the files live.

## Assigning tags

Right-click one or more files. The context menu has a Tags section:

- With the custom tag row, a row of colored dots toggles each tag on the
  selection (the menu stays open), and a **+** opens the New Tag dialog. If not
  every tag fits inline, an **All Tags** submenu lists the rest.
- Otherwise a **Tags** submenu holds one toggle per tag.
- **New Tag…** creates a tag and **Remove All Tags** clears every tag from the
  selection (shown when the selection has tags).

A tag name must not be empty, must not contain a comma, and is at most 64
characters. A tag has one of nine colors (blue, teal, green, yellow, orange,
red, pink, purple, slate) or no color, which makes it a text tag.

Tags assigned to a file also appear as a `Tags` row in its Properties dialog.

## Browsing tags

Tags appear as a section in the sidebar. Selecting a tag lists every file
carrying it, across folders (the virtual location `tag:///<name>`). The Tags
overview page (`tag:///`) lists all tags with a **New Tag…** button and a
**Hidden Tags** button. Each tag has a context menu with Edit, Hide/Unhide and
Delete; hidden tags keep their data and can be unhidden from the Hidden Tags
page.

Files that no longer exist are dropped from a tag listing as they are found.

## Searching by tag

The search filter popover (the button next to the search box) shows a **Tags**
row of toggle chips when tags exist. Toggled tags are combined with AND: a
result must carry all of them. See [SEARCH.md](SEARCH.md).

## Where tags are stored

- On the file: the `user.xdg.tags` extended attribute, a comma-separated list of
  tag names. This is the same convention Dolphin uses, so tags follow copies and
  interoperate with KDE.
- Tag colors, hiding, and a lookup index of tagged files: a SQLite database at
  `<user data dir>/mariner/tags.db` (normally `~/.local/share/mariner/tags.db`).
  The index is healed from file xattrs when a listing disagrees with it, so
  files tagged or moved outside Mariner are picked up.
- On filesystems that cannot store xattrs (for example FAT, read-only, or files
  you do not own), the tag is kept in the index only. It works inside Mariner
  but does not travel with the file.

Renaming a tag rewrites the xattr of every file that carries it. Deleting a tag
removes it from every file.

## Turning tags off

**Preferences > Tags > Enable Tags** hides tags from the sidebar, file views,
menus, search, and command palette. Tag data is kept and returns when you
re-enable it.
