import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import Gio from 'gi:Gio-2.0'
import GLib from 'gi:GLib-2.0'
import { createPathBar } from './pathbar.ts'
import { createSearchFilterButton } from './search-filter.ts'
import type { PathBar } from './pathbar.ts'
import type { GFile, ViewMode, SearchFilter } from '../core/types.ts'

export interface ToolbarHandlers {
  onNavigate: (file: GFile) => void
  onOpenTab: (file: GFile) => void
  onOpenWindow: (file: GFile) => void
  onProperties: (file: GFile) => void
  onLocationEntry: (text: string) => void
  onSearchChanged: (text: string) => void
  onSearchFilter: (f: SearchFilter) => void
  onSearchExit: () => void
}

export interface Toolbar {
  header: any
  pathbar: PathBar
  locationEntry: any
  searchEntry: any
  searchButton: any
  showStack: (name: string) => void
  setViewIcon: (mode: ViewMode) => void
}

/* Content-area header bar: history, breadcrumb/location/search stack, view
 * controls, new-folder. Buttons drive win.* actions defined by the window. */
export function createToolbar({ onNavigate, onOpenTab, onOpenWindow, onProperties, onLocationEntry, onSearchChanged, onSearchFilter, onSearchExit }: ToolbarHandlers): Toolbar {
  const header = new Adw.HeaderBar()

  /* History controls — flat (not raised/linked), matching the search/view
   * buttons rather than reading as a solid pair. */
  const histBox = new Gtk.Box()
  const backButton = iconButton('go-previous-symbolic', 'Back', 'win.back')
  const forwardButton = iconButton('go-next-symbolic', 'Forward', 'win.forward')
  backButton.addCssClass('flat')
  forwardButton.addCssClass('flat')
  histBox.append(backButton)
  histBox.append(forwardButton)
  header.packStart(histBox)

  /* Title: pathbar | location-entry | search */
  const pathbar = createPathBar({ onNavigate, onOpenTab, onOpenWindow, onProperties })

  const locationEntry = new Gtk.Entry({ hexpand: true })
  locationEntry.on('activate', () => onLocationEntry(locationEntry.getText()))
  const locationBox = new Gtk.Box()
  locationBox.addCssClass('linked')
  locationBox.append(locationEntry)
  const locationClose = iconButton('window-close-symbolic', 'Cancel', null)
  locationClose.on('clicked', () => showStack('pathbar'))
  locationBox.append(locationClose)

  const searchEntry = new Gtk.SearchEntry({ hexpand: true })
  searchEntry.on('search-changed', () => onSearchChanged(searchEntry.getText()))
  /* Escape cancels search; losing focus while empty exits to the pathbar
   * (unless focus went to the filter popover). */
  searchEntry.on('stop-search', () => onSearchExit())
  const filterButton = createSearchFilterButton(onSearchFilter)
  const searchFocus = new Gtk.EventControllerFocus()
  searchFocus.on('leave', () => GLib.idleAdd(GLib.PRIORITY_DEFAULT_IDLE, () => {
    if (!searchEntry.getText() && !filterButton.widget.getActive()) onSearchExit()
    return false
  }))
  searchEntry.addController(searchFocus)
  const searchBox = new Gtk.Box()
  searchBox.addCssClass('linked')
  searchBox.append(searchEntry)
  searchBox.append(filterButton.widget)

  const titleStack = new Gtk.Stack({ transitionType: Gtk.StackTransitionType.CROSSFADE, hexpand: true })
  titleStack.addNamed(pathbar.widget, 'pathbar')
  titleStack.addNamed(locationBox, 'location')
  titleStack.addNamed(searchBox, 'search')

  /* Losing focus on the location entry reverts to the breadcrumb display
   * (nautilus's location entry cancels on focus-out). Deferred to idle so it
   * doesn't reshuffle the stack mid focus-change, and guarded on the entry
   * still being shown so an Enter-navigation that already switched away — or a
   * switch to search — isn't clobbered back to the pathbar. */
  const locationFocus = new Gtk.EventControllerFocus()
  locationFocus.on('leave', () => GLib.idleAdd(GLib.PRIORITY_DEFAULT_IDLE, () => {
    if (titleStack.getVisibleChildName() === 'location') showStack('pathbar')
    return false
  }))
  locationEntry.addController(locationFocus)

  const searchButton = new Gtk.ToggleButton({ iconName: 'edit-find-symbolic', tooltipText: 'Search Current Folder' })

  const viewButton = new Adw.SplitButton({
    iconName: 'view-grid-symbolic', menuModel: buildViewMenu(), tooltipText: 'View Options',
  })
  viewButton.setActionName('win.toggle-view')

  /* AdwHeaderBar reserves symmetric space around the (hexpanding) title equal to
   * the wider of the two sides, so any imbalance shows up as a gap on the lighter
   * side. Balance the sides — history on the start, search + view controls on the
   * end (search nearest the pathbar, view next to the window buttons) — so the
   * path/search stack fills the full width edge-to-edge with no gap. */
  header.packEnd(viewButton)
  header.packEnd(searchButton)
  header.setTitleWidget(titleStack)

  function showStack(name: string): void { titleStack.setVisibleChildName(name) }
  function setViewIcon(mode: ViewMode): void {
    /* Show the icon for the mode you'd switch TO. */
    viewButton.setIconName(mode === 'grid' ? 'view-list-symbolic' : 'view-grid-symbolic')
  }

  return { header, pathbar, locationEntry, searchEntry, searchButton, showStack, setViewIcon }
}

function iconButton(iconName: string, tooltip: string, actionName: string | null): any {
  const b = new Gtk.Button({ iconName, tooltipText: tooltip })
  if (actionName) b.setActionName(actionName)
  return b
}

function buildViewMenu(): any {
  const menu = Gio.Menu.new()

  const sort = Gio.Menu.new()
  sort.append('Name', 'win.sort-name')
  sort.append('Size', 'win.sort-size')
  sort.append('Type', 'win.sort-type')
  sort.append('Last Modified', 'win.sort-modified')
  menu.appendSection('Sort', sort)

  const dir = Gio.Menu.new()
  dir.append('Descending', 'win.sort-desc')
  menu.appendSection(null, dir)

  const opts = Gio.Menu.new()
  opts.append('Show Hidden Files', 'win.show-hidden')
  menu.appendSection(null, opts)

  const zoom = Gio.Menu.new()
  zoom.append('Zoom In', 'win.zoom-in')
  zoom.append('Zoom Out', 'win.zoom-out')
  menu.appendSection(null, zoom)

  return menu
}
