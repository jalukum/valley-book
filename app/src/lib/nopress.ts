// v7.2.1: no long-press menus. iOS shows a context menu / link preview / image callout when you hold a link or picture,
// and desktop browsers show a right-click menu. Text boxes keep theirs (paste, select all). Images can't be dragged out.
const editable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el?.closest?.('input, textarea, [contenteditable="true"], .path');
};
export function installNoLongPress(doc: Document) {
  doc.addEventListener('contextmenu', (e) => { if (!editable(e.target)) e.preventDefault(); }, { capture: true });
  doc.addEventListener('dragstart', (e) => { if ((e.target as HTMLElement)?.tagName === 'IMG' || !editable(e.target)) e.preventDefault(); }, { capture: true });
  doc.addEventListener('selectstart', (e) => { if (!editable(e.target)) e.preventDefault(); }, { capture: true });
}
export const isEditable = editable;
