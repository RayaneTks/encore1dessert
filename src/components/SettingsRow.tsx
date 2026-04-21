import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center gap-4 px-5 py-4 active:bg-gourmand-bg transition-colors">
      <div className="w-8 h-8 rounded-xl bg-gourmand-bg flex items-center justify-center flex-shrink-0 text-gourmand-cocoa/30">
        {icon}
      </div>
      <p className="flex-1 font-bold tracking-tight text-[11px] uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-black italic text-gourmand-strawberry bg-gourmand-strawberry/5 px-2 py-1 rounded-lg">{value}</p>
        <ChevronRight size={14} className="text-gourmand-cocoa/20" />
      </div>
    </div>
  );
};
