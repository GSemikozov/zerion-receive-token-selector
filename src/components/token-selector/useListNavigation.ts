import { type KeyboardEvent, useState } from 'react';

interface ListNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  scrollToIndex: (index: number) => void;
}

/**
 * Highlight state for the ARIA combobox pattern: focus stays in the search input, ↑/↓ move the
 * highlighted option (exposed via aria-activedescendant), Enter selects it.
 */
export function useListNavigation<T>({ items, onSelect, scrollToIndex }: ListNavigationOptions<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Derived, so a shrinking list can never leave the highlight out of range.
  const active = Math.min(activeIndex, items.length - 1);
  const activeItem: T | undefined = items[active];

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) return;
      const next = active + (event.key === 'ArrowDown' ? 1 : -1);
      const clamped = Math.max(0, Math.min(next, items.length - 1));
      setActiveIndex(clamped);
      scrollToIndex(clamped);
    } else if (event.key === 'Enter' && activeItem !== undefined) {
      event.preventDefault();
      onSelect(activeItem);
    }
  };

  return { active, activeItem, setActiveIndex, onKeyDown };
}
