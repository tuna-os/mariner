import Gtk from 'gi:Gtk-4.0'
import Adw from 'gi:Adw-1'
import { basename } from 'node:path'
import { scanChildren } from '../core/disk-usage.ts'
import type { UsageNode } from '../core/disk-usage.ts'
import { formatBytes } from '../core/format.ts'
import { TreemapView } from './treemap.ts'

/* A disk-usage analyzer window: a squarified treemap of the folder's children by
 * size, scanned live (incremental, cancellable). Click a folder tile to drill
 * in; Back ascends. Baobab/WinDirStat in-app. Local paths only. */
export function diskUsageDialog(parent: any, startPath: string): void {
  const win = new Adw.Window({ modal: false })
  win.setTransientFor(parent)
  win.setDefaultSize(900, 640)

  const title = new Adw.WindowTitle({ title: '' })
  const header = new Adw.HeaderBar()
  header.setTitleWidget(title)
  const back = new Gtk.Button({ iconName: 'go-previous-symbolic', tooltipText: 'Back', sensitive: false })
  header.packStart(back)
  const spinner = new Adw.Spinner({ widthRequest: 16, heightRequest: 16, visible: false })
  header.packEnd(spinner)

  const treemap = new TreemapView()

  /* Bottom status: total size, or the hovered tile's name + size. */
  const status = new Gtk.Label({ label: '', xalign: 0, ellipsize: 3, marginTop: 6, marginBottom: 6, marginStart: 12, marginEnd: 12, cssClasses: ['dim-label'] })
  const statusBar = new Gtk.Box()
  statusBar.append(status)

  const view = new Adw.ToolbarView()
  view.addTopBar(header)
  view.setContent(treemap.widget)
  view.addBottomBar(statusBar)
  win.setContent(view)

  const history: string[] = []
  let current = ''
  let total = 0
  /* A fresh flag object per scan; setting `.cancelled` stops the previous walk. */
  let flag = { cancelled: true }

  const showTotal = () => status.setLabel(current ? `${formatBytes(total)} total in ${basename(current) || current}` : '')

  treemap.onHover = (node: UsageNode | null) => {
    if (node) status.setLabel(`${node.name} — ${formatBytes(node.bytes)}`)
    else showTotal()
  }
  treemap.onActivate = (node: UsageNode) => scan(node.path, true)
  back.on('clicked', () => { const p = history.pop(); if (p !== undefined) scan(p, false) })
  win.on('close-request', () => { flag.cancelled = true; return false })

  function scan(path: string, pushHistory: boolean): void {
    if (pushHistory && current) history.push(current)
    back.setSensitive(history.length > 0)
    flag.cancelled = true
    const mine = flag = { cancelled: false }
    current = path
    total = 0
    title.setTitle(basename(path) || path)
    title.setSubtitle(path)
    spinner.setVisible(true)
    treemap.setNodes([])
    showTotal()
    scanChildren(path, (nodes, done) => {
      if (mine.cancelled) return
      treemap.setNodes(nodes)
      total = nodes.reduce((s, n) => s + n.bytes, 0)
      showTotal()
      if (done) spinner.setVisible(false)
    }, () => mine.cancelled)
  }

  scan(startPath, false)
  win.present()
}
