import React, { useState, useEffect } from 'react';
import { Scale, Target, Database, RotateCcw, Donut } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SettingsRow } from '../components/SettingsRow';
import { FormLabel } from '../components/FormLabel';
import type { BundleOfferConfig } from '../types';

interface Props {
  targetMargin: number;
  onChangeTargetMargin: (val: number) => void;
  bundleOffer: BundleOfferConfig;
  onChangeBundleOffer: (config: BundleOfferConfig) => void;
}

export const SettingsScreen: React.FC<Props> = ({
  targetMargin,
  onChangeTargetMargin,
  bundleOffer,
  onChangeBundleOffer,
}) => {
  const marginPct = Math.round(targetMargin * 100);
  const [bo, setBo] = useState<BundleOfferConfig>(bundleOffer);

  useEffect(() => {
    setBo(bundleOffer);
  }, [bundleOffer]);

  const patchBo = (p: Partial<BundleOfferConfig>) => {
    const next = { ...bo, ...p };
    setBo(next);
    onChangeBundleOffer(next);
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
          <SectionCard title="Offre lot (caisse)" padding={false}>
            <div className="space-y-4 p-4">
              <p className="text-xs text-gourmand-biscuit leading-relaxed">
                Réduction sur la quantité encaissée (ex. 5 tartes à 15 € au lieu de 5 × prix catalogue). Les totaux
                compta utilisent le montant réel encaissé.
              </p>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={bo.enabled}
                  onChange={e => patchBo({ enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-gourmand-border text-gourmand-chocolate"
                />
                <span className="text-sm font-semibold text-gourmand-chocolate">Activer l&apos;offre</span>
              </label>
              <div>
                <FormLabel>Taille du lot (nᵉ article promo)</FormLabel>
                <input
                  type="number"
                  min={2}
                  max={50}
                  step={1}
                  disabled={!bo.enabled}
                  value={bo.bundleSize}
                  onChange={e =>
                    patchBo({ bundleSize: Math.min(50, Math.max(2, parseInt(e.target.value, 10) || 5)) })
                  }
                  className="gourmand-input w-full text-base disabled:opacity-50"
                />
              </div>
              <div>
                <FormLabel>Mode de calcul</FormLabel>
                <div className="mt-2 space-y-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gourmand-border bg-white p-3">
                    <input
                      type="radio"
                      name="bundle-mode"
                      checked={bo.useFixedBundleTotal}
                      disabled={!bo.enabled}
                      onChange={() => patchBo({ useFixedBundleTotal: true })}
                      className="mt-1"
                    />
                    <span>
                      <span className="text-sm font-semibold text-gourmand-chocolate">Forfait par lot</span>
                      <span className="mt-0.5 block text-xs text-gourmand-biscuit">
                        Chaque lot complet = un total fixe (€), le reste au prix catalogue.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gourmand-border bg-white p-3">
                    <input
                      type="radio"
                      name="bundle-mode"
                      checked={!bo.useFixedBundleTotal}
                      disabled={!bo.enabled}
                      onChange={() => patchBo({ useFixedBundleTotal: false })}
                      className="mt-1"
                    />
                    <span>
                      <span className="text-sm font-semibold text-gourmand-chocolate">Dernière unité à prix fixe</span>
                      <span className="mt-0.5 block text-xs text-gourmand-biscuit">
                        (n − 1) × prix catalogue + prix promo pour la nᵉ unité de chaque lot.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              {bo.useFixedBundleTotal ? (
                <div>
                  <FormLabel>Total du lot complet (€)</FormLabel>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={!bo.enabled}
                    value={bo.fixedBundleTotal}
                    onChange={e => patchBo({ fixedBundleTotal: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="gourmand-input w-full text-base disabled:opacity-50"
                  />
                </div>
              ) : (
                <div>
                  <FormLabel>Prix de la nᵉ unité (€)</FormLabel>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={!bo.enabled}
                    value={bo.discountedUnitPrice}
                    onChange={e => patchBo({ discountedUnitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="gourmand-input w-full text-base disabled:opacity-50"
                  />
                </div>
              )}
              <div>
                <FormLabel>Tarifs concernés</FormLabel>
                <select
                  disabled={!bo.enabled}
                  value={bo.appliesTo}
                  onChange={e => patchBo({ appliesTo: e.target.value as BundleOfferConfig['appliesTo'] })}
                  className="gourmand-input mt-1 w-full text-base disabled:opacity-50"
                >
                  <option value="particulier">Particulier uniquement</option>
                  <option value="pro">Pro uniquement</option>
                  <option value="both">Particulier et Pro</option>
                </select>
              </div>
            </div>
          </SectionCard>
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
          <p className="text-xs text-gourmand-biscuit mt-2 font-medium">
            Gestion de coûts · v1.0.0
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'Réinitialiser les préférences locales ?\n\nCela remet la marge cible à 65%, l’offre lot aux valeurs par défaut, et efface les rappels de notification.\n\nLes données Supabase (ingrédients, recettes, commandes, historique) ne sont PAS supprimées.'
                )
              ) {
                localStorage.removeItem('e1d_target_margin');
                localStorage.removeItem('e1d_bundle_offer_v1');
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
