import { type PointerEvent, type RefObject, useRef } from 'react';
import { isSheetLayout } from './media';

// Past a quarter of the sheet's height, or on a quick flick, releasing dismisses.
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 0.5; // px/ms

interface Drag {
  startY: number;
  startTime: number;
  dy: number;
}

/**
 * Drag-down-to-close for the bottom sheet, bound to a drag region (handle + header). The sheet
 * is moved imperatively via `style.translate` so dragging doesn't re-render React every frame.
 * Keyboard and screen-reader users close via Esc or the Close button (WCAG 2.5.7).
 */
export function useSwipeToDismiss(sheetRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const dragRef = useRef<Drag | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const sheet = sheetRef.current;
    if (!sheet || event.button !== 0 || !isSheetLayout()) return;
    // Buttons in the header (Close, Back) keep working as taps.
    if ((event.target as Element).closest('button')) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { startY: event.clientY, startTime: event.timeStamp, dy: 0 };
    sheet.style.transition = 'none'; // follow the finger 1:1
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const sheet = sheetRef.current;
    const drag = dragRef.current;
    if (!sheet || !drag) return;
    drag.dy = Math.max(0, event.clientY - drag.startY); // can't pull it above its resting place
    sheet.style.translate = `0 ${drag.dy}px`;
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const sheet = sheetRef.current;
    const drag = dragRef.current;
    dragRef.current = null;
    if (!sheet || !drag) return;
    // Restoring the CSS transition and setting the target in the same frame animates from the
    // dragged position: down and out, or back up to rest.
    sheet.style.transition = '';
    const velocity = drag.dy / Math.max(1, event.timeStamp - drag.startTime);
    if (drag.dy > sheet.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) {
      sheet.style.translate = '0 100%';
      onDismiss();
    } else {
      sheet.style.translate = '';
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };
}
