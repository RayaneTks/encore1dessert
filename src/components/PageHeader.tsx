import React from 'react';

interface PageHeaderProps {
  brand?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ brand, title, description, action }) => {
  return (
    <header className="px-4 pt-8 pb-6 sticky top-0 bg-gourmand-bg/90 backdrop-blur-xl z-30">
      <div className="flex justify-between items-start">
        <div className="max-w-[80%]">
          {brand && <p className="text-[11px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-2">{brand}</p>}
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-1">{title}</h1>
          {description && <p className="text-[13px] font-semibold text-gourmand-cocoa/70 leading-relaxed">{description}</p>}
        </div>

        {action}
      </div>
    </header>
  );
};
