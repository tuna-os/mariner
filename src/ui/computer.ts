import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import { fileForPath } from '../core/gio.ts'
import { formatBytes } from '../core/format.ts'
import { listPartitions, diskUsage } from '../core/drives.ts'
import type { Partition } from '../core/drives.ts'
import type { GFile } from '../core/types.ts'

/* The "Computer" interface: a Windows-Explorer "This PC"-style page listing
 * every drive/partition on the machine as a full-width row with its mount point
 * and a live disk-usage bar. Reached by navigating to computer:/// (the sidebar's
 * Computer entry). A pure view — clicking a row calls onActivate(mountPoint) so
 * the pane navigates. */
export interface ComputerView {
  widget: any
  refresh: () => void
  onActivate: (file: GFile) => void
  onContextMenu: (file: GFile, widget: any, x: number, y: number) => void
}

export function createComputerView(): ComputerView {
  const list = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8, valign: Gtk.Align.START })
  list.addCssClass('computer-list')

  const empty = new Adw.StatusPage({ iconName: 'drive-harddisk-symbolic', title: 'No Drives Found' })

  /* A stack so the (rare) driveless case shows a status page instead of a blank. */
  const stack = new Gtk.Stack()
  const clamp = new Adw.Clamp({ maximumSize: 720, child: list, marginTop: 18, marginBottom: 18, marginStart: 12, marginEnd: 12 })
  stack.addNamed(new Gtk.ScrolledWindow({ child: clamp, vexpand: true, hexpand: true, hscrollbarPolicy: Gtk.PolicyType.NEVER }), 'drives')
  stack.addNamed(empty, 'empty')
  stack.addCssClass('computer-view')

  const api: ComputerView = { widget: stack, refresh, onActivate: () => {}, onContextMenu: () => {} }

  function refresh(): void {
    let c
    while ((c = list.getFirstChild()) !== null) list.remove(c)
    const parts = listPartitions()
    for (const p of parts) list.append(row(p))
    stack.setVisibleChildName(parts.length ? 'drives' : 'empty')
  }

  function row(p: Partition): any {
    const btn = new Gtk.Button()
    btn.addCssClass('computer-tile')
    btn.addCssClass('flat')
    btn.setTooltipText(`${p.device} · ${p.fsType}`)
    btn.on('clicked', () => api.onActivate(fileForPath(p.mountPath)))

    /* Right-click → drive context menu (Open / Analyze Disk Usage / Properties). */
    const secondary = new Gtk.GestureClick({ button: 3 })
    secondary.on('pressed', (...a: any[]) => {
      const [x, y] = a.slice(-2)
      api.onContextMenu(fileForPath(p.mountPath), btn, x, y)
    })
    btn.addController(secondary)

    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 })
    box.append(new Gtk.Image({
      iconName: p.mountPath === '/' ? 'drive-harddisk-system-symbolic' : 'drive-harddisk-symbolic',
      pixelSize: 32,
      valign: Gtk.Align.CENTER,
    }))

    const info = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, hexpand: true, valign: Gtk.Align.CENTER })

    /* Title and mount point side by side. */
    const header = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 })
    const name = new Gtk.Label({ label: p.label, xalign: 0, ellipsize: 3 /* END */ })
    name.addCssClass('computer-tile-name')
    header.append(name)
    const desc = new Gtk.Label({ label: p.mountPath, xalign: 0, hexpand: true, ellipsize: 3 })
    desc.addCssClass('computer-tile-desc')
    desc.addCssClass('dim-label')
    header.append(desc)
    info.append(header)

    const bar = new Gtk.ProgressBar({ fraction: 0 })
    bar.addCssClass('computer-tile-bar')
    info.append(bar)

    const usage = new Gtk.Label({ label: '', xalign: 0, ellipsize: 3 })
    usage.addCssClass('computer-tile-usage')
    usage.addCssClass('dim-label')
    info.append(usage)
    box.append(info)
    btn.setChild(box)

    diskUsage(p.mountPath).then(u => {
      bar.setFraction(u.fraction)
      if (u.fraction >= 0.9) bar.addCssClass('computer-tile-bar-full')
      usage.setLabel(`${formatBytes(u.free)} free of ${formatBytes(u.total)}`)
    }).catch(() => usage.setLabel('Usage unavailable'))

    return btn
  }

  return api
}
