import React from 'react';
import { TrendingDown, Scale, Target, Database, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SettingsRow } from '../components/SettingsRow';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsScreen: React.FC<Props> = ({ showToast }) => {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-2 pb-32">
      <PageHeader
        title="Réglages"
        brand="Configuration"
        description="Paramètres de l'application et gestion des données."
      />
      <div className="px-4 space-y-4">
        <SectionCard title="Paramètres de calcul">
          <SettingsRow icon={<TrendingDown size={18} />} label="TVA Pâtisserie" value="5.5%" />
          <SettingsRow icon={<Scale size={18} />} label="Unité de base" value="Grammes" />
          <SettingsRow icon={<Target size={18} />} label="Marge Cible" value="× 4.0" />
        </SectionCard>

        <SectionCard title="Données">
          <SettingsRow icon={<Database size={18} />} label="Stockage" value="Local" />
        </SectionCard>

        <div className="mt-8 text-center">
          <div className="w-16 h-16 rounded-[24px] bg-white border border-gourmand-border mx-auto flex items-center justify-center text-3xl shadow-sm mb-4">
            🍩
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gourmand-cocoa/60">Encore 1 Dessert</p>
          <p className="text-[8px] font-bold text-gourmand-cocoa/40 mt-1 uppercase">Gestion de coûts · v1.0.0</p>
          <button
            onClick={() => {
              if (confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) {
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
