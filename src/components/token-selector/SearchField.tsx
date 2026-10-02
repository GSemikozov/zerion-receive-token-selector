import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

/** Search input styled like Zerion's: focus ring on the wrapper, magnifier on the left. */
export function SearchField(props: ComponentProps<'input'>) {
  return (
    <div className="px-4 pb-3">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-input bg-muted px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="size-5 shrink-0 text-primary" aria-hidden />
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          {...props}
          className="min-w-0 flex-1 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
