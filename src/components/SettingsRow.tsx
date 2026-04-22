import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  /** Texte affiché à droite (ignoré si `trailing` est fourni) */
  value?: string;
  /** Contenu personnalisé à droite (ex. champ numérique) */
  trailing?: React.ReactNode;
  /** Affiche la flèche à droite (désactiver pour les lignes informatives) */
  showChevron?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  value,
  trailing,
  showChevron = true,
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 min-h-[52px] active:bg-gourmand-bg/80 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gourmand-bg flex items-center justify-center flex-shrink-0 text-gourmand-cocoa/40">
        {icon}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gourmand-chocolate leading-snug">
          {label}
        </p>
      </div>
      {trailing != null ? (
        <div className="flex-shrink-0 flex items-center">{trailing}</div>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0 max-w-[45%] justify-end">
          {value != null && value !== '' && (
            <p className="text-sm font-semibold text-gourmand-cocoa tabular-nums truncate text-right">
              {value}
            </p>
          )}
          {showChevron && <ChevronRight size={16} className="text-gourmand-biscuit/50 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
};
