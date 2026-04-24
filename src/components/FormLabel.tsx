import React from 'react';

interface FormLabelProps {
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({ children }) => {
  return (
    <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gourmand-cocoa/75">
      {children}
    </p>
  );
};
