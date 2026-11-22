# Search

Mariner searches the current folder and everything below it, with results
appearing as they are found.

## Starting a search

- Press **Ctrl+F**, or use the **Search Current Folder** button in the header
  bar, then type in the search box.
- **Enter** moves focus to the results while keeping the query in place.
- **Escape** exits search.

Hidden files are included only when hidden files are shown in the view.

## Name search (default)

A background worker walks the tree breadth-first, so matches nearest the
starting folder appear first. An entry matches when its name contains the query
(case-insensitive). Symlinked folders are not followed and unreadable folders
are skipped.

## Content search (ripgrep)

Open the filter popover (the button next to the search box) and switch on
**Contents**. Mariner then runs [ripgrep](https://github.com/BurntSushi/ripgrep)
(`rg`) and lists files whose contents contain the query.

- The query is a literal, case-insensitive substring, not a regular expression.
- Ignore files are not applied (`--no-ignore`), so everything you can see is
  searched.
- Nothing is indexed first.
- `rg` must be on `PATH`. If it is not found, Mariner reports that content
  search requires ripgrep.
- Content search needs a non-empty query and a local folder.

## Filters

The filter popover offers:

| Filter       | Options                                                         |
| ------------ | --------------------------------------------------------------- |
| **What**     | Anything, Folders, Documents, Images, Music, Video              |
| **When**     | Any time, Today, This week, This month, This year               |
| **Contents** | Off (match names) or on (match file contents with ripgrep)      |
| **Tags**     | Toggle chips; results must carry all toggled tags (shown only when tags exist) |

**When** filters by modification time over the last 1, 7, 30, or 365 days.
Filters apply to both name and content search. Documents covers text files plus
office, OpenDocument, PDF, RTF, and e-book types.
