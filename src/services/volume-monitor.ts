import Gio from 'gi:Gio-2.0'
import GLib from 'gi:GLib-2.0'

/* Centralized access to the GIO VolumeMonitor.
 *
 * The first `Gio.VolumeMonitor.get()` is synchronous and, when the gvfs daemon
 * is not already running, blocks on a D-Bus autostart for the full ~25s timeout
 * while each proxy volume monitor lists its volumes (emitting the "Error
 * creating proxy … org.gtk.vfs.Daemon" warning on the way). Triggering that on
 * the window-construction path means the window can't paint until it returns.
 *
 * So the blocking `.get()` is done exactly once, off the first-paint path, from
 * a low-priority idle. Callers on a hot/sync path (the sidebar's initial build,
 * the pathbar's per-crumb classification) use `volumeMonitor()`, which returns
 * the cached singleton or null and never forces the blocking get. */

let monitor: any = null
let started = false
const listeners = new Set<() => void>()

/* The cached VolumeMonitor, or null until initVolumeMonitor() has completed. */
export function volumeMonitor(): any | null {
  return monitor
}

/* Every signal through which the mount/volume/drive set changes (nautilus
 * watches the same set to keep its sidebar live). */
const CHANGE_SIGNALS = [
  'mount-added', 'mount-removed', 'mount-changed',
  'volume-added', 'volume-removed', 'volume-changed',
  'drive-connected', 'drive-disconnected', 'drive-changed',
]

function notify(): void {
  for (const cb of listeners) try { cb() } catch { /* stale/destroyed view */ }
}

/* Acquire the VolumeMonitor off the first-paint path and invoke `onChange` once
 * it is ready, then on every mount/volume/drive change. The singleton and its
 * signal wiring are process-wide; each caller (one per window) just adds its own
 * listener, so a window that opens after init still gets an immediate refresh. */
export function initVolumeMonitor(onChange: () => void): void {
  listeners.add(onChange)
  if (started) {
    if (monitor) onChange()
    return
  }
  started = true
  GLib.idleAdd(GLib.PRIORITY_LOW, () => {
    try {
      monitor = Gio.VolumeMonitor.get()
      for (const sig of CHANGE_SIGNALS)
        try { monitor.on(sig, notify) } catch { /* signal absent on this build */ }
    } catch {
      monitor = null
    }
    notify()
    return false
  })
}
