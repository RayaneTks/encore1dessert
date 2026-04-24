import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';

export interface FilterMenuOption<T extends string> {
  value: T;
  label: string;
}

const optionBtnBase =
  'h-11 w-full rounded-xl text-left text-xs font-semibold border px-3 transition-all duration-200 active:scale-[0.98]';
const optionBtnActive = 'bg-gourmand-chocolate text-white border-gourmand-chocolate shadow-sm';
const optionBtnIdle = 'bg-white text-gourmand-biscuit border-gourmand-border';

interface RadioGroupProps<T extends string> {
  title: string;
  options: FilterMenuOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

/**
 * Liste radio dans le panneau filtre — même style partout (Ordres / Compta).
 */
export function FilterMenuRadioGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gourmand-biscuit">{title}</p>
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`${optionBtnBase} ${value === opt.value ? optionBtnActive : optionBtnIdle}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PopoverProps {
  /** Libellé accessibilité du bouton déclencheur */
  'aria-label': string;
  /** Pastille si &gt; 0 (filtre actif hors « tout ») */
  badgeCount?: number;
  children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  className?: string;
}

/**
 * Bouton type menu (icône burger) ouvrant un panneau filtre — partagé Ordres / Compta.
 */
export function FilterPopoverButton({
  'aria-label': ariaLabel,
  badgeCount = 0,
  children,
  className = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const panel =
    typeof children === 'function' ? children({ close }) : children;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-gourmand-border bg-white text-gourmand-chocolate shadow-sm transition-transform active:scale-95"
      >
        <Menu size={20} strokeWidth={2} aria-hidden />
        {badgeCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,17rem)] rounded-2xl border border-gourmand-border bg-gourmand-bg p-3 shadow-lg"
        >
          {panel}
        </div>
      )}
    </div>
  );
}
