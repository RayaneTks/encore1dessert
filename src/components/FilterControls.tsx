import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FormLabel } from './FormLabel';

/** Tri / filtre client (liste déroulante) — Compta / Ordres */
export const CUSTOMER_SORT_OPTIONS = [
  { value: 'all' as const, label: 'Tout' },
  { value: 'particulier' as const, label: 'Particulier' },
  { value: 'pro' as const, label: 'Pro' },
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

const pillBase =
  'shrink-0 rounded-full border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98]';
const pillActive = 'border-gourmand-chocolate bg-gourmand-chocolate text-white';
const pillIdle = 'border-gourmand-border bg-white text-gourmand-biscuit';

/**
 * Pastilles horizontales (scroll) — période Compta, statut Ordres (style capsule).
 */
export function FilterPillRow<T extends string>({
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
      className={`flex min-w-0 gap-2 overflow-x-auto scrollbar-hide pb-0.5 ${className}`.trim()}
    >
      {options.map(opt => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`${pillBase} ${value === opt.value ? pillActive : pillIdle}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Pastilles en grille — encaissement / formulaires (2 ou 3 choix).
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

/**
 * Liste déroulante « Trier par » — type client (défaut Tout).
 */
export function FilterSortByCustomer({
  value,
  onChange,
}: {
  value: 'all' | 'particulier' | 'pro';
  onChange: (next: 'all' | 'particulier' | 'pro') => void;
}) {
  return (
    <div className="min-w-0">
      <FormLabel>Trier par</FormLabel>
      <div className="relative mt-1">
        <select
          className="gourmand-input w-full max-w-full min-w-0 cursor-pointer appearance-none pr-10 text-base font-semibold text-gourmand-chocolate"
          value={value}
          onChange={e => onChange(e.target.value as 'all' | 'particulier' | 'pro')}
          aria-label="Trier par type de client"
        >
          {CUSTOMER_SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gourmand-biscuit" aria-hidden>
          <ChevronDown size={18} strokeWidth={2} />
        </div>
      </div>
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
