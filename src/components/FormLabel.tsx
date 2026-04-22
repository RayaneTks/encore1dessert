import React from 'react';

interface FormLabelProps {
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({ children }) => {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit mb-2 block">
      {children}
    </p>
  );
};
