import Gio from 'gi:Gio-2.0'
import Gtk from 'gi:Gtk-4.0'
import { F } from '../core/gio.ts'
import { getPlaces, getBookmarks, getDevices } from '../services/places-service.ts'
import type { GFile, Place } from '../core/types.ts'

/* Section types drive the separators between groups (mirrors nautilus'
 * NautilusSidebarSectionType + list_box_header_func: a separator is inserted
 * whenever a row's section differs from the previous row's — no text headers). */
const SECTION_DEFAULT = 0
const SECTION_BOOKMARKS = 1
const SECTION_MOUNTS = 2

interface SidebarRow { row: any; uri: string }

export interface Sidebar {
  widget: any
  setActive: (file: GFile) => void
  refresh: () => void
}

/* Places sidebar (pure view). onNavigate(file) on row activation.
 * A faithful port of nautilus-sidebar.c: one `.navigation-sidebar` GtkListBox,
 * single-selection, sections separated by GtkSeparators via a header func. */
export function createSidebar(onNavigate: (file: GFile) => void): Sidebar {
  const list = new Gtk.ListBox({ selectionMode: Gtk.SelectionMode.SINGLE })
  list.addCssClass('navigation-sidebar')
  list.setActivateOnSingleClick(true)
  let rows: SidebarRow[] = []

  list.on('row-activated', (...a: any[]) => {
    const row = a[a.length - 1]
    if (row?._file) onNavigate(row._file)
  })

  /* Section of the previous appended row, so a separator can be set on the row
   * that opens a new section (mirrors nautilus' list_box_header_func, but set
   * directly at build time — node-gtk mis-marshals GtkListBox.setHeaderFunc). */
  let prevSection = -1

  function addRow(place: Place, section: number): void {
    const row = new Gtk.ListBoxRow({ focusOnClick: false })
    row._file = place.file
    row._section = section

    const b = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL })
    b.append(new Gtk.Image({ iconName: place.icon, marginEnd: 8 }))
    b.append(new Gtk.Label({
      label: place.label,
      xalign: 0,
      hexpand: true,
      ellipsize: 2 /* Pango.EllipsizeMode.MIDDLE */,
      marginEnd: 2,
    }))

    /* Eject/unmount button for removable devices (nautilus' eject_button). */
    const mount = place.mount
    if (mount != null) {
      const canEject = safe(() => mount.canEject())
      const canUnmount = safe(() => mount.canUnmount())
      if (canEject || canUnmount) {
        const eject = new Gtk.Button({
          iconName: 'media-eject-symbolic',
          halign: Gtk.Align.CENTER,
          valign: Gtk.Align.CENTER,
          marginStart: 4,
          tooltipText: canEject ? 'Eject' : 'Unmount',
        })
        eject.addCssClass('sidebar-button')
        eject.addCssClass('flat')
        eject.on('clicked', () => ejectMount(mount, canEject))
        b.append(eject)
      }
    }

    row.setChild(b)
    list.append(row)
    if (prevSection !== -1 && prevSection !== section)
      row.setHeader(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }))
    prevSection = section
    rows.push({ row, uri: F.getUri(place.file) })
  }

  function build(): void {
    let c
    while ((c = list.getFirstChild()) !== null) list.remove(c)
    rows = []
    prevSection = -1
    for (const p of getPlaces()) addRow(p, SECTION_DEFAULT)
    for (const p of getBookmarks()) addRow(p, SECTION_BOOKMARKS)
    for (const p of getDevices()) addRow(p, SECTION_MOUNTS)
  }

  function setActive(file: GFile): void {
    const uri = F.getUri(file)
    list.unselectAll()
    const match = rows.find(r => r.uri === uri)
    if (match) list.selectRow(match.row)
  }

  build()
  const scroll = new Gtk.ScrolledWindow({ child: list, vexpand: true, hscrollbarPolicy: Gtk.PolicyType.NEVER })
  return { widget: scroll, setActive, refresh: build }
}

function safe(fn: () => boolean): boolean {
  try { return !!fn() } catch { return false }
}

function ejectMount(mount: any, eject: boolean): void {
  try {
    const flags = Gio.MountUnmountFlags.NONE
    if (eject) mount.ejectWithOperation(flags, null, null, () => {})
    else mount.unmountWithOperation(flags, null, null, () => {})
  } catch { /* best-effort */ }
}
