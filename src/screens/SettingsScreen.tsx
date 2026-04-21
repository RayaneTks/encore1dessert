import React from 'react';
import { Scale, Target, Database, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SettingsRow } from '../components/SettingsRow';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  targetMargin: number;
  onChangeTargetMargin: (val: number) => void;
}

export const SettingsScreen: React.FC<Props> = ({ showToast, targetMargin, onChangeTargetMargin }) => {
  const marginPct = Math.round(targetMargin * 100);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-2 pb-32">
      <PageHeader
        title="Réglages"
        brand="Configuration"
        description="Paramètres de l'application."
      />
      <div className="px-4 space-y-4">
        <SectionCard title="Paramètres de calcul">
          <SettingsRow icon={<Scale size={18} />} label="Unité de base" value="Grammes" />

          {/* Marge cible éditable */}
          <div className="flex items-center gap-4 py-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-gourmand-bg flex items-center justify-center flex-shrink-0 text-gourmand-biscuit">
              <Target size={18} />
            </div>
            <span className="flex-1 text-sm font-semibold text-gourmand-chocolate">Marge Cible</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={marginPct}
                onChange={e => {
                  const v = Math.min(99, Math.max(0, parseInt(e.target.value) || 0));
                  onChangeTargetMargin(v / 100);
                }}
                className="w-14 text-right bg-transparent font-bold text-gourmand-chocolate outline-none text-sm"
              />
              <span className="text-sm font-semibold text-gourmand-biscuit">%</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Données">
          <SettingsRow icon={<Database size={18} />} label="Stockage" value="Supabase" />
        </SectionCard>

        <div className="mt-8 text-center">
          <div className="w-16 h-16 rounded-[24px] bg-white border border-gourmand-border mx-auto flex items-center justify-center text-3xl shadow-sm mb-4">
            🍩
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gourmand-cocoa/60">Encore 1 Dessert</p>
          <p className="text-[8px] font-bold text-gourmand-cocoa/40 mt-1 uppercase">Gestion de coûts · v1.0.0</p>
          <button
            onClick={() => {
              if (confirm('Réinitialiser les préférences locales ?\n\nCela remet la marge cible à 65% et efface les rappels de notification.\n\nLes données Supabase (ingrédients, recettes, commandes, historique) ne sont PAS supprimées.')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="mt-8 text-[10px] font-black text-red-400 uppercase tracking-widest border border-red-100 px-4 py-2.5 rounded-xl flex items-center gap-2 mx-auto active:scale-95 transition-transform"
          >
            <RotateCcw size={12} /> Réinitialiser l'app
          </button>
        </div>
      </div>
    </div>
  );
};
