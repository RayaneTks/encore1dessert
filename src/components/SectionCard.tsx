import React from 'react';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  padding?: boolean;
  /** Espacement vertical du bloc entier (titre + carte) par rapport au précédent */
  stackClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, padding = true, stackClassName = '' }) => {
  return (
    <div className={`mb-0 min-w-0 ${stackClassName}`.trim()}>
      {title && <h2 className="section-title">{title}</h2>}
      <div className={`gourmand-card ${padding ? 'p-4' : ''}`}>
        {children}
      </div>
    </div>
  );
};
