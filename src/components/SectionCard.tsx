import React from 'react';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  padding?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, padding = true }) => {
  return (
    <div className="mb-6">
      {title && <h2 className="section-title">{title}</h2>}
      <div className={`gourmand-card ${padding ? 'p-1' : ''}`}>
        {children}
      </div>
    </div>
  );
};
