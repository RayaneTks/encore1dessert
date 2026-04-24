import React from 'react';

/** Libellés filtres client — réutilisés Compta / Ordres */
export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'all' as const, label: 'Tous' },
  { value: 'particulier' as const, label: 'Particuliers' },
  { value: 'pro' as const, label: 'Pros' },
];

/** Encaissement : choix binaire (pas de « tous ») */
export const CUSTOMER_TYPE_VALIDATE_OPTIONS = [
  { value: 'particulier' as const, label: 'Particulier' },
  { value: 'pro' as const, label: 'Pro' },
];

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

const chipBase =
  'min-h-11 w-full rounded-xl border px-2 text-center text-xs font-semibold transition-all duration-200 active:scale-[0.98]';

const chipActive = 'border-gourmand-chocolate bg-gourmand-chocolate text-white shadow-sm';
const chipIdle = 'border-gourmand-border bg-white text-gourmand-biscuit';

function gridColsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-2';
}

/**
 * Pastilles de filtre — même rendu partout (période, statut, type client).
 * Grille responsive : 3 colonnes pour 3 options, 2×2 pour 4 options, etc.
 */
export function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel,
}: {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`grid min-w-0 gap-2 ${gridColsClass(options.length)} ${className}`.trim()}
    >
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`${chipBase} ${value === opt.value ? chipActive : chipIdle}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Titre de groupe de filtres — identique Compta / Ordres */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gourmand-biscuit">{label}</p>
      {children}
    </div>
  );
}
