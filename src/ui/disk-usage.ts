import Gtk from 'gi:Gtk-4.0'
import { basename } from 'node:path'
import { scanTree } from '../core/disk-usage.ts'
import type { UsageNode } from '../core/disk-usage.ts'
import { SunburstView } from './sunburst.ts'

/* Disk-usage chart widget: a Baobab-style rings chart of a folder's tree by
 * size, scanned live (incremental, cancellable). Click a folder wedge to drill
 * in; Back ascends. Local paths only. Embedded in the Properties dialog's
 * "Disk Usage" expander; the scan is deferred until `start()` so opening
 * Properties stays cheap — the caller triggers it when the section is revealed,
 * and `cancel()`s it when the dialog closes. */
export interface UsageChart {
  widget: any
  start: () => void
  cancel: () => void
}

export function createUsageChart(startPath: string): UsageChart {
  const chart = new SunburstView()
  chart.widget.setVexpand(true)

  /* Header (Back + the current folder's name) is shown only once the user has
   * drilled in; at the top level of the scan there is nothing to ascend to and
   * no folder name to show, so it stays hidden. */
  const back = new Gtk.Button({ iconName: 'go-previous-symbolic', tooltipText: 'Back' })
  back.addCssClass('flat')
  const title = new Gtk.Label({ label: '', xalign: 0, hexpand: true, ellipsize: 3 /* END */ })
  const header = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, visible: false })
  header.append(back)
  header.append(title)

  const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
  box.append(header)
  box.append(chart.widget)

  /* The tree is scanned exactly once; drilling in / Back just re-roots the view
   * to another node of that same in-memory tree — no navigation ever re-scans. */
  const stack: UsageNode[] = []   // ancestors of the node currently shown
  let current: UsageNode | null = null
  let started = false
  let flag = { cancelled: true }

  chart.onActivate = (node: UsageNode) => {
    if (node.isDir && node.children && node.children.length && node !== current) {
      stack.push(current!)
      show(node)
    }
  }
  back.on('clicked', () => { const p = stack.pop(); if (p) show(p) })

  function show(node: UsageNode): void {
    current = node
    const drilled = stack.length > 0
    header.setVisible(drilled)          // hidden at the top level of the scan
    if (drilled) title.setLabel(basename(node.path) || node.path)
    chart.setRoot(node)
  }

  function scan(): void {
    flag.cancelled = true
    const mine = flag = { cancelled: false }
    stack.length = 0
    current = null
    header.setVisible(false)
    chart.setRoot(null)
    scanTree(startPath, 5, (root, done) => {
      if (mine.cancelled) return
      /* Refresh live only while still viewing the (growing) root; once the user
       * has drilled in, leave their view untouched. */
      if (current === null || current === root) { current = root; show(root) }
    }, () => mine.cancelled)
  }

  return {
    widget: box,
    start: () => { if (!started) { started = true; scan() } },
    cancel: () => { flag.cancelled = true },
  }
}
