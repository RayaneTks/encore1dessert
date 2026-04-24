import React from 'react';

export interface FilterSegmentOption<T extends string> {
  value: T;
  label: string;
}

type Columns = 2 | 3 | 4;

const colClass: Record<Columns, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

interface Props<T extends string> {
  options: FilterSegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Nombre de colonnes sur la grille (défaut selon len(options)). */
  columns?: Columns;
  /** `compact` = pastilles type onglets Ordres ; `comfortable` = cartes type Compta. */
  density?: 'compact' | 'comfortable';
  className?: string;
  'aria-label'?: string;
}

function inferColumns<T extends string>(n: number): Columns {
  if (n <= 2) return 2;
  if (n === 3) return 3;
  return 4;
}

/**
 * Filtres segmentés (grille) — même interaction Compta / Ordres (touch 44px, focus visible).
 */
export function FilterSegmentGrid<T extends string>({
  options,
  value,
  onChange,
  columns,
  density = 'comfortable',
  className = '',
  'aria-label': ariaLabel,
}: Props<T>) {
  const cols = columns ?? inferColumns(options.length);
  const base =
    density === 'compact'
      ? 'min-h-10 rounded-full text-[11px] font-semibold border transition-all duration-200 active:scale-[0.98]'
      : 'min-h-11 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-[0.98]';
  const active =
    density === 'compact'
      ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
      : 'bg-gourmand-chocolate text-white border-gourmand-chocolate shadow-sm';
  const idle =
    density === 'compact'
      ? 'bg-gourmand-bg text-gourmand-biscuit border-gourmand-border'
      : 'bg-white text-gourmand-biscuit border-gourmand-border';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`grid min-w-0 gap-2 ${colClass[cols]} ${className}`.trim()}
    >
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`${base} ${value === opt.value ? active : idle}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
