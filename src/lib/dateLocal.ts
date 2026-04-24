/** Date calendaire locale au format YYYY-MM-DD (aligné sur les champs <input type="date">). */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Met une date (issue BDD, input, ou ISO avec heure) au format YYYY-MM-DD
 * pour comparaisons fiables. Sans ça, `2026-4-24` &lt; `2026-04-25` en tri lexicographique donne le mauvais sens.
 */
export function toCalendarISODate(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return '';
  return localDateISO(new Date(s));
}

/**
 * La commande ne doit plus apparaître sur l’onglet Ordres : livrée, et on est après le jour
 * enregistré comme date de livraison (J+1 : plus affiché, contenu côté compta).
 */
export function commandeHiddenFromOrdresList(
  c: { status: string; deliveryDate: string | null | undefined },
  today: string = localDateISO(),
): boolean {
  if (c.status !== 'delivered') return false;
  const d = toCalendarISODate(c.deliveryDate ?? '');
  if (!d) return false;
  const t0 = toCalendarISODate(today);
  return d < t0;
}
