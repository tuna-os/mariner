import Gio from 'gi:Gio-2.0'

/* The window's primary app menu. Extracted from window.ts: it is a pure menu
 * builder with no state, so it does not need to live on the window class. */

export function appMenu(): any {
  const menu = Gio.Menu.new()
  const s1 = Gio.Menu.new()
  s1.append('Command Palette', 'win.command-palette')
  s1.append('New Window', 'win.new-window')
  s1.append('New Tab', 'win.new-tab')
  s1.append('Split View', 'win.toggle-split')
  s1.append('Add to Bookmarks', 'win.add-bookmark')
  menu.appendSection(null, s1)
  const s2 = Gio.Menu.new()
  s2.append('Undo', 'win.undo')
  s2.append('Redo', 'win.redo')
  menu.appendSection(null, s2)
  const s3 = Gio.Menu.new()
  s3.append('Preferences', 'win.preferences')
  s3.append('Keyboard Shortcuts', 'win.shortcuts')
  s3.append('About Files', 'win.about')
  s3.append('Quit', 'win.quit')
  menu.appendSection(null, s3)
  return menu
}
