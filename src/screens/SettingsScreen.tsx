import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Scale, Target, Database, RotateCcw, Donut, Plus, Trash2, AlertTriangle, ChevronDown } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SettingsRow } from '../components/SettingsRow';
import { FormLabel } from '../components/FormLabel';
import type { BundleOfferRule, Dessert, DessertProductKind } from '../types';
import { DESSERT_PRODUCT_KIND_OPTIONS } from '../types';
import { findDuplicateDessertIdsInRules, newEmptyBundleRule } from '../lib/bundleOffer';
import { fmt } from '../lib/calculations';

function scopeHint(bo: BundleOfferRule): string {
  const familyLabels = bo.productKinds
    .map(k => DESSERT_PRODUCT_KIND_OPTIONS.find(o => o.value === k)?.label ?? k)
    .join(', ');
  const bits: string[] = [];
  if (familyLabels) bits.push(familyLabels);
  if (bo.dessertIds.length > 0) bits.push(`${bo.dessertIds.length} recette(s)`);
  return bits.length > 0 ? bits.join(' · ') : 'aucun type ni recette coché';
}

function offerSummaryLine(bo: BundleOfferRule): string {
  const n = bo.bundleSize;
  const who = bo.appliesTo === 'particulier' ? 'Part.' : bo.appliesTo === 'pro' ? 'Pro' : 'Part. + Pro';
  const price = bo.useFixedBundleTotal
    ? `forfait ${fmt(bo.fixedBundleTotal)} / lot`
    : `nᵉ à ${fmt(bo.discountedUnitPrice)}`;
  return `Lot de ${n} — ${price} — ${who} — ${scopeHint(bo)}`;
}

interface Props {
  targetMargin: number;
  onChangeTargetMargin: (val: number) => void;
  desserts: Dessert[];
  bundleRules: BundleOfferRule[];
  onChangeBundleRules: (rules: BundleOfferRule[]) => void;
}

export const SettingsScreen: React.FC<Props> = ({
  targetMargin,
  onChangeTargetMargin,
  desserts,
  bundleRules,
  onChangeBundleRules,
}) => {
  const marginPct = Math.round(targetMargin * 100);
  const [rules, setRules] = useState<BundleOfferRule[]>(bundleRules);
  const [dessertFilter, setDessertFilter] = useState<Record<string, string>>({});
  /** Préférence replier/déplier par offre. Absence de clé = panneau ouvert. */
  const [rulePanelOpen, setRulePanelOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRules(bundleRules);
  }, [bundleRules]);

  const duplicateIds = useMemo(() => findDuplicateDessertIdsInRules(rules), [rules]);

  const commit = (next: BundleOfferRule[]) => {
    setRules(next);
    onChangeBundleRules(next);
  };

  const patchRule = (id: string, p: Partial<BundleOfferRule>) => {
    commit(rules.map(r => (r.id === id ? { ...r, ...p } : r)));
  };

  const isRuleOpen = useCallback(
    (id: string) => rulePanelOpen[id] !== false,
    [rulePanelOpen],
  );

  const setRuleOpen = (id: string, open: boolean) => {
    setRulePanelOpen(p => ({ ...p, [id]: open }));
  };

  const expandAllRules = () => {
    setRulePanelOpen(Object.fromEntries(rules.map(r => [r.id, true])));
  };

  const collapseAllRules = () => {
    setRulePanelOpen(Object.fromEntries(rules.map(r => [r.id, false])));
  };

  const addRule = () => {
    const nr = newEmptyBundleRule();
    const withNew = [...rules, nr];
    commit(withNew);
    setRulePanelOpen(() =>
      Object.fromEntries(withNew.map(r => [r.id, r.id === nr.id] as const)) as Record<string, boolean>,
    );
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    commit(rules.filter(r => r.id !== id));
    setRulePanelOpen(p => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const toggleProductKind = (ruleId: string, k: DessertProductKind) => {
    const r = rules.find(x => x.id === ruleId);
    if (!r) return;
    const s = new Set(r.productKinds);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    patchRule(ruleId, { productKinds: [...s] });
  };

  const toggleDessertInRule = (ruleId: string, dessertId: string) => {
    const r = rules.find(x => x.id === ruleId);
    if (!r) return;
    const s = new Set(r.dessertIds);
    if (s.has(dessertId)) s.delete(dessertId);
    else s.add(dessertId);
    patchRule(ruleId, { dessertIds: [...s] });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-2 pb-32">
      <PageHeader
        title="Réglages"
        brand="Configuration"
        description="Paramètres de l'application."
      />

      <div className="px-4 pt-3 space-y-10">
        <section>
          <SectionCard title="Paramètres de calcul" padding={false}>
            <div className="divide-y divide-gourmand-border/60">
              <SettingsRow
                icon={<Scale size={18} strokeWidth={2} />}
                label="Unité de base"
                value="Grammes"
                showChevron={false}
              />
              <SettingsRow
                icon={<Target size={18} strokeWidth={2} />}
                label="Marge cible"
                showChevron={false}
                trailing={
                  <div className="flex items-center gap-1 rounded-lg border border-gourmand-border bg-white px-2.5 py-1.5 shadow-sm">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step={1}
                      value={marginPct}
                      onChange={e => {
                        const v = Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0));
                        onChangeTargetMargin(v / 100);
                      }}
                      className="w-10 min-w-0 bg-transparent text-right text-sm font-semibold text-gourmand-chocolate outline-none tabular-nums"
                      aria-label="Marge cible en pourcentage"
                    />
                    <span className="text-xs font-medium text-gourmand-biscuit tabular-nums">%</span>
                  </div>
                }
              />
            </div>
          </SectionCard>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="px-0.5 text-sm font-bold uppercase tracking-wide text-gourmand-biscuit">Offres lot</h2>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={collapseAllRules}
                className="min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gourmand-cocoa/70 transition-colors hover:bg-gourmand-border/30"
              >
                Tout replier
              </button>
              <span className="text-gourmand-biscuit/50" aria-hidden>
                |
              </span>
              <button
                type="button"
                onClick={expandAllRules}
                className="min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gourmand-cocoa/70 transition-colors hover:bg-gourmand-border/30"
              >
                Tout déplier
              </button>
              <button
                type="button"
                onClick={addRule}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gourmand-chocolate px-3 py-1.5 text-xs font-bold text-white shadow-sm"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>

          {duplicateIds.length > 0 && (
            <div className="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="shrink-0" size={16} />
              <p>
                Même recette listée dans plusieurs offres. La règle <strong>en haut de liste</strong> d’abord :{' '}
                {duplicateIds
                  .map(id => desserts.find(d => d.id === id)?.name ?? id)
                  .join(', ')}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {rules.map((bo, ruleIdx) => {
              const displayTitle = bo.name.trim() || `Offre ${ruleIdx + 1}`;
              const open = isRuleOpen(bo.id);
              return (
                <div key={bo.id} className="gourmand-card overflow-hidden p-0">
                  <div className="flex min-h-[3.5rem] items-stretch">
                    <button
                      type="button"
                      onClick={() => setRuleOpen(bo.id, !open)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
                      aria-expanded={open}
                      aria-controls={`bundle-panel-${bo.id}`}
                    >
                      <ChevronDown
                        size={20}
                        className={`shrink-0 text-gourmand-biscuit transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-bold text-gourmand-chocolate">{displayTitle}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              bo.enabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gourmand-border/40 text-gourmand-biscuit'
                            }`}
                          >
                            {bo.enabled ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-gourmand-biscuit">{offerSummaryLine(bo)}</p>
                      </div>
                    </button>
                    {rules.length > 1 && (
                      <div className="flex items-center pr-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeRule(bo.id);
                          }}
                          className="min-h-11 min-w-11 rounded-lg p-2.5 text-red-500 transition-colors hover:bg-red-50"
                          aria-label="Supprimer l'offre"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {open ? (
                    <div
                      id={`bundle-panel-${bo.id}`}
                      className="space-y-3 border-t border-gourmand-border/50 p-4"
                    >
                      <div>
                        <FormLabel>Nom (optionnel)</FormLabel>
                        <p className="mt-0.5 text-xs text-gourmand-biscuit">Libellé en historique / compta. Vide = titre généré automatiquement.</p>
                        <input
                          type="text"
                          value={bo.name}
                          onChange={e => patchRule(bo.id, { name: e.target.value })}
                          className="gourmand-input mt-1.5 w-full text-sm"
                          placeholder="ex. Lot 5 tartes = 15 €"
                        />
                      </div>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gourmand-border/60 bg-gourmand-bg/30 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={bo.enabled}
                          onChange={e => patchRule(bo.id, { enabled: e.target.checked })}
                          className="h-5 w-5 rounded border-gourmand-border text-gourmand-chocolate"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gourmand-chocolate">Actif en caisse</span>
                          <p className="text-xs text-gourmand-biscuit">Si désactivé, cette règle ne s’applique pas en caisse (utile pour la couper temporairement).</p>
                        </div>
                      </label>
                      <div>
                        <FormLabel>Taille du lot (n)</FormLabel>
                        <p className="mt-0.5 text-xs text-gourmand-biscuit">
                          Nombre de pièces du <em>même</em> produit pour former un lot (ex. 5). Le reste après multiples de n est
                          au tarif fiche.
                        </p>
                        <input
                          type="number"
                          min={2}
                          max={50}
                          step={1}
                          disabled={!bo.enabled}
                          value={bo.bundleSize}
                          onChange={e =>
                            patchRule(bo.id, { bundleSize: Math.min(50, Math.max(2, parseInt(e.target.value, 10) || 5)) })
                          }
                          className="gourmand-input mt-1.5 w-full text-base disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <FormLabel>Type d’offre (sur n pièces)</FormLabel>
                        <p className="mb-2 mt-0.5 text-xs text-gourmand-biscuit">
                          Le n est celui de « Taille du lot ». Les deux formules s’appliquent <strong>par gâteau</strong> (même
                          recette) sur la ligne.
                        </p>
                        <div className="mt-2 space-y-2">
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gourmand-border bg-white p-3.5">
                            <input
                              type="radio"
                              name={`bundle-mode-${bo.id}`}
                              checked={bo.useFixedBundleTotal}
                              disabled={!bo.enabled}
                              onChange={() => patchRule(bo.id, { useFixedBundleTotal: true })}
                              className="mt-0.5 shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug text-gourmand-chocolate">
                                1. Forfait : « n pièces = un seul total en € »
                              </span>
                              <span className="mt-1.5 block text-xs leading-relaxed text-gourmand-biscuit">
                                Vous remplissez <strong>un seul</strong> montant (champ juste en dessous) pour n pièces
                                d&apos;affilée. Tous les <strong>lots entiers</strong> de n utilisent ce total. Le reste (les
                                pièces restantes <em>qui ne forment plus un lot complet</em>) est facturé <strong>au prix de la
                                fiche, pièce par pièce</strong>.
                              </span>
                              <span className="mt-1.5 block text-[10px] leading-relaxed text-gourmand-cocoa/65">
                                Ex. n = 5, forfait 15 €, client en prend 7 → 15 € (les 5) + 2 × prix fiche.
                              </span>
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gourmand-border bg-white p-3.5">
                            <input
                              type="radio"
                              name={`bundle-mode-${bo.id}`}
                              checked={!bo.useFixedBundleTotal}
                              disabled={!bo.enabled}
                              onChange={() => patchRule(bo.id, { useFixedBundleTotal: false })}
                              className="mt-0.5 shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug text-gourmand-chocolate">
                                2. Chaque n pièces : n − 1 au tarif, 1 en promo
                              </span>
                              <span className="mt-1.5 block text-xs leading-relaxed text-gourmand-biscuit">
                                À l&apos;intérieur d&apos;un <strong>lot de n</strong> : n − 1 pièces au <strong>tarif affiché
                                (fiche / caisse)</strong>, <strong>une</strong> pièce à la valeur du champ <strong>« Prix unité
                                promo »</strong> (sous le choix). C&apos;est le cas typique d&apos;une « 5e moins chère » : les 4
                                premières plein tarif, la 5e en promo.
                              </span>
                              <span className="mt-1.5 block text-[10px] leading-relaxed text-gourmand-cocoa/65">
                                Ex. n = 5, fiche 4 €, promo 1 €, 7 pièces → (4+4+4+4+1) + 4 + 4.
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>
                      {bo.useFixedBundleTotal ? (
                        <div>
                          <FormLabel>Total pour un lot complet (€)</FormLabel>
                          <p className="mt-0.5 text-xs text-gourmand-biscuit">Prix TTC des n pièces en mode forfait.</p>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            disabled={!bo.enabled}
                            value={bo.fixedBundleTotal}
                            onChange={e => patchRule(bo.id, { fixedBundleTotal: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="gourmand-input mt-1.5 w-full text-base disabled:opacity-50"
                          />
                        </div>
                      ) : (
                        <div>
                          <FormLabel>Prix unité « promo » (dernière du lot) (€)</FormLabel>
                          <p className="mt-0.5 text-xs text-gourmand-biscuit">Utilisé pour la nᵉ pièce de chaque lot (les autres = tarif fiche).</p>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            disabled={!bo.enabled}
                            value={bo.discountedUnitPrice}
                            onChange={e =>
                              patchRule(bo.id, { discountedUnitPrice: Math.max(0, parseFloat(e.target.value) || 0) })
                            }
                            className="gourmand-input mt-1.5 w-full text-base disabled:opacity-50"
                          />
                        </div>
                      )}
                      <div>
                        <FormLabel>Réservé à quel type de client</FormLabel>
                        <p className="mt-0.5 text-xs text-gourmand-biscuit">Doit coïncider avec Particulier / Pro choisi en caisse.</p>
                        <select
                          disabled={!bo.enabled}
                          value={bo.appliesTo}
                          onChange={e => patchRule(bo.id, { appliesTo: e.target.value as BundleOfferRule['appliesTo'] })}
                          className="gourmand-input mt-1.5 w-full text-base disabled:opacity-50"
                        >
                          <option value="particulier">Particulier uniquement</option>
                          <option value="pro">Pro uniquement</option>
                          <option value="both">Particulier et Pro</option>
                        </select>
                      </div>

                      <div>
                        <FormLabel>Familles de recettes</FormLabel>
                        <p className="mb-2 mt-0.5 text-xs text-gourmand-biscuit">
                          Au moins une coche. S’additionne aux recettes cochées plus bas. Même recette couverte par deux offres
                          : celle <strong>au-dessus</strong> dans la page est appliquée en premier.
                        </p>
                        <div className="flex flex-col gap-2">
                          {DESSERT_PRODUCT_KIND_OPTIONS.map(opt => (
                            <label
                              key={opt.value}
                              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gourmand-border bg-white px-3 py-2"
                            >
                              <input
                                type="checkbox"
                                disabled={!bo.enabled}
                                checked={bo.productKinds.includes(opt.value)}
                                onChange={() => toggleProductKind(bo.id, opt.value)}
                                className="h-4 w-4 rounded border-gourmand-border text-gourmand-chocolate"
                              />
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gourmand-chocolate">{opt.label}</span>
                                <p className="text-[10px] text-gourmand-biscuit">{opt.hint}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <FormLabel>Recettes (en plus des familles)</FormLabel>
                        <p className="mb-0.5 text-xs text-gourmand-biscuit">Optionnel : cible une ou des recettes nommée(s).</p>
                        <input
                          type="search"
                          placeholder="Filtrer…"
                          value={dessertFilter[bo.id] ?? ''}
                          onChange={e => setDessertFilter(f => ({ ...f, [bo.id]: e.target.value }))}
                          className="gourmand-input mb-2 mt-1.5 w-full text-sm"
                        />
                        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gourmand-border/80 bg-gourmand-bg/40 p-2">
                          {desserts
                            .filter(d => {
                              const q = (dessertFilter[bo.id] ?? '').toLowerCase();
                              if (!q) return true;
                              return d.name.toLowerCase().includes(q) || d.emoji.includes(q);
                            })
                            .map(d => (
                              <label
                                key={d.id}
                                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/80"
                              >
                                <input
                                  type="checkbox"
                                  disabled={!bo.enabled}
                                  checked={bo.dessertIds.includes(d.id)}
                                  onChange={() => toggleDessertInRule(bo.id, d.id)}
                                  className="h-4 w-4 rounded border-gourmand-border text-gourmand-chocolate"
                                />
                                <span className="text-sm text-gourmand-chocolate">
                                  {d.emoji} {d.name}
                                </span>
                              </label>
                            ))}
                          {desserts.length === 0 && <p className="p-2 text-xs text-gourmand-biscuit">Aucun dessert en base.</p>}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionCard title="Données" padding={false}>
            <div className="divide-y divide-gourmand-border/60">
              <SettingsRow
                icon={<Database size={18} strokeWidth={2} />}
                label="Stockage"
                value="Supabase"
                showChevron={false}
              />
            </div>
          </SectionCard>
        </section>

        <footer className="pt-4 pb-6 text-center border-t border-gourmand-border/40">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gourmand-border bg-white text-gourmand-chocolate shadow-sm" aria-hidden>
            <Donut size={28} strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gourmand-cocoa/70">
            Encore 1 Dessert
          </p>
          <p className="text-xs text-gourmand-biscuit mt-2 font-medium">Gestion de coûts · v1.0.0</p>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'Réinitialiser les préférences locales ?\n\nCela remet la marge cible à 65%, les offres lot aux valeurs par défaut, et efface les rappels de notification.\n\nLes données Supabase (ingrédients, recettes, commandes, historique) ne sont PAS supprimées.',
                )
              ) {
                localStorage.removeItem('e1d_target_margin');
                localStorage.removeItem('e1d_bundle_offer_v1');
                localStorage.removeItem('e1d_bundle_rules_v2');
                localStorage.removeItem('e1d_notif_schedule_v1');
                window.location.reload();
              }
            }}
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-red-500 active:scale-[0.98] transition-transform"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Réinitialiser l'app
          </button>
        </footer>
      </div>
    </div>
  );
};
