/** A snake_case code as sentence-case text, the way the portals show statuses: `not_arrived` → "Not arrived". */
export function formatStatus(code: string): string {
  const words = code.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
