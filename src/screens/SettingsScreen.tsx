import React from 'react';
import { Scale, Target, Database, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SettingsRow } from '../components/SettingsRow';

interface Props {
  targetMargin: number;
  onChangeTargetMargin: (val: number) => void;
}

export const SettingsScreen: React.FC<Props> = ({ targetMargin, onChangeTargetMargin }) => {
  const marginPct = Math.round(targetMargin * 100);

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
          <div className="w-14 h-14 rounded-2xl bg-white border border-gourmand-border mx-auto flex items-center justify-center text-2xl shadow-sm mb-5">
            🍩
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
                  'Réinitialiser les préférences locales ?\n\nCela remet la marge cible à 65% et efface les rappels de notification.\n\nLes données Supabase (ingrédients, recettes, commandes, historique) ne sont PAS supprimées.'
                )
              ) {
                localStorage.removeItem('e1d_target_margin');
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
