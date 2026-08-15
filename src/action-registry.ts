import Gio from 'gi:Gio-2.0'
import GLib from 'gi:GLib-2.0'

import { fileForPath } from './core/gio.ts'
import { HOME } from './core/format.ts'
import { DEFAULT_ZOOM, ZOOM_STEP } from './window.ts'
import { aboutDialog } from './ui/dialogs.ts'
import { shortcutsDialog } from './ui/shortcuts.ts'
import { preferencesDialog } from './ui/preferences.ts'
import { openWithDialog } from './ui/open-with.ts'

import type { AppWindow } from './window.ts'

/* The window's action registry. Extracted from window.ts so the God-file's
 * `_buildActions` (114 LOC / ~50 registrations) lives beside the other
 * self-contained builders instead of inside the window class. Pure structural
 * move: the constructor calls buildActions(win) at the same point `_buildActions`
 * used to run, and every registration is identical. */

export function buildActions(win: AppWindow): void {
  const add = (name: string, cb: () => void): any => {
    const a = Gio.SimpleAction.new(name, null)
    a.on('activate', cb)
    win.window.addAction(a)
    win._actions[name] = a
    return a
  }
  const addToggle = (name: string, initial: boolean, cb: (a: any) => void): any => {
    const a = Gio.SimpleAction.newStateful(name, null, GLib.Variant.newBoolean(initial))
    a.on('change-state', () => cb(a))
    win.window.addAction(a)
    win._actions[name] = a
    return a
  }

  win.backAction = add('back', () => win.activeTab?.back())
  win.forwardAction = add('forward', () => win.activeTab?.forward())
  win.upAction = add('up', () => win.activeTab?.up())
  add('reload', () => win.activeTab?.reload())
  add('go-home', () => win.navigate(fileForPath(HOME)))

  add('new-tab', () => win.openTab(win.activeTab?.location ?? fileForPath(HOME)))
  add('new-window', () => win._newWindow())
  add('toggle-split', () => win.activeTab?.toggleSplit())
  add('focus-other-pane', () => win.activeTab?.focusOtherPane())
  add('command-palette', () => win._openPalette())
  add('copy-to-other-pane', () => win._copyToOtherPane(false))
  add('move-to-other-pane', () => win._copyToOtherPane(true))
  add('close-tab', () => { if (win.activeTab) win.tabView.closePage(win.activeTab.page) })
  add('tab-prev', () => win.tabView.selectPreviousPage())
  add('tab-next', () => win.tabView.selectNextPage())
  add('quit', () => win.window.close())
  add('about', () => aboutDialog(win.window))
  add('shortcuts', () => shortcutsDialog().present(win.window))
  add('preferences', () => preferencesDialog(win.window, win))

  win.undoAction = add('undo', () => win.undo.undo())
  win.redoAction = add('redo', () => win.undo.redo())
  win.undoAction.setEnabled(false)
  win.redoAction.setEnabled(false)

  add('new-folder', () => win._newFolder())
  add('create-link', () => win._link())
  add('toggle-view', () => win._setViewMode(win.prefs.viewMode === 'grid' ? 'list' : 'grid'))
  add('view-grid', () => win._setViewMode('grid'))
  add('view-list', () => win._setViewMode('list'))
  add('zoom-in', () => win._zoom(ZOOM_STEP))
  add('zoom-out', () => win._zoom(-ZOOM_STEP))
  add('zoom-reset', () => win._zoom(DEFAULT_ZOOM - win.prefs.iconSize))
  add('choose-columns', () => win._chooseColumns())
  add('invert-selection', () => win.activeTab?.view.invertSelection())

  for (const key of ['name', 'size', 'type', 'modified'] as const) {
    win.sortActions[key] = addToggle('sort-' + key, key === win.prefs.sortKey, () => {
      win.prefs.sortKey = key
      win._syncSort()
      win.activeTab?.applyPrefs()
    })
  }
  win.sortDescAction = addToggle('sort-desc', false, () => {
    win.prefs.sortDesc = !win.prefs.sortDesc
    win.sortDescAction.setState(GLib.Variant.newBoolean(win.prefs.sortDesc))
    win.activeTab?.applyPrefs()
  })
  win.hiddenAction = addToggle('show-hidden', false, () => {
    win.prefs.showHidden = !win.prefs.showHidden
    win.hiddenAction.setState(GLib.Variant.newBoolean(win.prefs.showHidden))
    win.activeTab?.applyPrefs()
  })

  add('location', () => win._showLocationEntry())
  win.searchAction = addToggle('search', false, () => win._toggleSearch())
  win.toolbar.searchButton.setActionName('win.search')

  add('select-all', () => win.activeTab?.view.selectAll())
  add('preview', () => { if (win.activeTab) win.togglePreview(win.activeTab) })
  add('open', () => win._openSelection())
  add('open-new-tab', () => win._openNewTab())
  add('open-with', () => { const s = win._selected()[0]; if (s) openWithDialog(win.window, s.info, s.file) })
  add('open-terminal', () => win._openTerminal())
  add('set-wallpaper', () => win._setWallpaper())
  add('copy', () => win._clip(false))
  add('cut', () => win._clip(true))
  add('paste', () => win._paste())
  add('rename', () => win._renameSelected())
  add('trash', () => win._trash())
  add('delete', () => win._delete())
  add('properties', () => win._properties())
  add('empty-trash', () => win._emptyTrash())
  add('restore', () => win._restore())
  add('extract-here', () => win._extractHere())
  add('compress', () => win._compress())
  add('disk-usage', () => win._diskUsage())

  /* Computer-view drive menu — these act on `_ctxFile` (the drive's mount
   * point), set when the menu is opened, since that view has no selection. */
  add('drive-open', () => { if (win._ctxFile) win.navigate(win._ctxFile) })
  add('drive-open-tab', () => { if (win._ctxFile) win.openTab(win._ctxFile) })
  add('drive-usage', () => { if (win._ctxFile) win._propertiesFor(win._ctxFile, { expandUsage: true }) })
  add('drive-properties', () => { if (win._ctxFile) win._propertiesFor(win._ctxFile) })

  /* Bookmarks. add-bookmark (menu/keyboard) targets the current folder;
   * ctx-add-bookmark and the open/remove entries act on `_ctxFile`, which the
   * file-view and sidebar context menus set to the folder under the cursor. */
  add('add-bookmark', () => win._addBookmark(win.activeTab?.location ?? null))
  add('ctx-add-bookmark', () => win._addBookmark(win._ctxFile))
  add('bookmark-open', () => { if (win._ctxFile) win.navigate(win._ctxFile) })
  add('bookmark-open-tab', () => { if (win._ctxFile) win.openTab(win._ctxFile) })
  add('remove-bookmark', () => win._removeBookmark(win._ctxFile))
}
