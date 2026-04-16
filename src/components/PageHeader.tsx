import React from 'react';

interface PageHeaderProps {
  brand?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ brand, title, description, action }) => {
  return (
    <header className="px-6 pt-6 pb-6 sticky top-0 bg-gourmand-bg/90 backdrop-blur-xl z-30">
      <div className="flex justify-between items-start">
        <div className="max-w-[80%]">
          {brand && <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gourmand-biscuit mb-2">{brand}</p>}
          <h1 className="text-3xl font-black italic tracking-tighter leading-tight drop-shadow-sm mb-1">{title}</h1>
          {description && <p className="text-[11px] font-bold text-gourmand-cocoa/60 leading-relaxed">{description}</p>}
        </div>

        {action}
      </div>
    </header>
  );
};
