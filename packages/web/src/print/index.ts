/**
 * Prints only the element with `id`, which is hidden on screen. The print
 * stylesheet (@curo/web/styles.css) shows just the element marked `printing`.
 */
export function printOnly(id: string): void {
  const area = document.getElementById(id);
  if (!area) return;
  area.classList.add("printing");
  window.print(); // blocks until the print dialog closes
  area.classList.remove("printing");
}
