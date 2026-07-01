/* Squarified treemap layout (Bruls, Huizing & van Wijk, 2000): pack weighted
 * items into a rectangle so each tile stays as close to square as possible.
 * Pure — no GTK. Items must have value > 0 (filter zeros before calling). */

export interface Weighted<T> { item: T; value: number }
export interface Tile<T> { item: T; x: number; y: number; w: number; h: number }

export function squarify<T>(items: Array<Weighted<T>>, x: number, y: number, w: number, h: number): Array<Tile<T>> {
  const tiles: Array<Tile<T>> = []
  if (w <= 0 || h <= 0) return tiles
  const total = items.reduce((s, it) => s + it.value, 0)
  if (total <= 0) return tiles

  /* Work in area units: scale each value to a pixel area within the rect. */
  const scale = (w * h) / total
  const remaining = items.map(it => ({ item: it.item, area: it.value * scale }))

  let rx = x, ry = y, rw = w, rh = h
  let i = 0
  while (i < remaining.length) {
    const side = Math.min(rw, rh)
    const row: Array<{ item: T; area: number }> = [remaining[i]]
    let best = worst(row, side)
    let j = i + 1
    for (; j < remaining.length; j++) {
      const w2 = worst([...row, remaining[j]], side)
      if (w2 > best) break
      row.push(remaining[j]); best = w2
    }
    const rowArea = row.reduce((s, r) => s + r.area, 0)
    if (rw >= rh) {
      const stripW = rowArea / rh
      let yy = ry
      for (const r of row) { const th = r.area / stripW; tiles.push({ item: r.item, x: rx, y: yy, w: stripW, h: th }); yy += th }
      rx += stripW; rw -= stripW
    } else {
      const stripH = rowArea / rw
      let xx = rx
      for (const r of row) { const tw = r.area / stripH; tiles.push({ item: r.item, x: xx, y: ry, w: tw, h: stripH }); xx += tw }
      ry += stripH; rh -= stripH
    }
    i = j
  }
  return tiles
}

/* Worst (largest) aspect ratio in a row laid along a side of the given length. */
function worst<T>(row: Array<{ item: T; area: number }>, side: number): number {
  let sum = 0, max = 0, min = Infinity
  for (const r of row) { sum += r.area; if (r.area > max) max = r.area; if (r.area < min) min = r.area }
  if (sum <= 0 || side <= 0) return Infinity
  const s2 = sum * sum, side2 = side * side
  return Math.max((side2 * max) / s2, s2 / (side2 * min))
}
