const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&apos;',
  '"': '&quot;',
}

/* Escape text for a widget property GTK parses as Pango markup, so the text is
 * shown as written. Pure (no GTK), so tests/ can import it.
 *
 * Several libadwaita properties take markup by default: the title and subtitle
 * of an Adw.ActionRow, the description of an Adw.StatusPage, the title of an
 * Adw.Toast. File names, paths and application names are untrusted there: a
 * name holding `&` or `<` fails to parse and the label comes out empty, and a
 * name that is valid markup is rendered as markup — `<a href="…">` becomes a
 * link that opens its target when clicked. */
export function escapeMarkup(text: string): string {
  return text.replace(/[&<>'"]/g, (c) => ENTITIES[c])
}
