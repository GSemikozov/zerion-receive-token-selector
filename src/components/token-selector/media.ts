// `matchMedia` is optional-called because jsdom doesn't implement it.

/** Tailwind's `max-sm`: where the dialog renders as a bottom sheet (Zerion switches at 640px too). */
export function isSheetLayout() {
  return window.matchMedia?.('(max-width: 639.98px)').matches ?? false;
}

/** Touch devices: auto-focusing a text field would pop the on-screen keyboard over the sheet. */
export function isCoarsePointer() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}
