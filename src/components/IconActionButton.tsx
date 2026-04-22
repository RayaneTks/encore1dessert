import React from 'react';

interface IconActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  /** `compact` = taille plus discrète (ex. barre d’onglets iOS) */
  size?: 'default' | 'compact';
}

export const IconActionButton: React.FC<IconActionButtonProps> = ({
  onClick,
  icon,
  label,
  disabled = false,
  size = 'default',
}) => {
  const box = size === 'compact' ? 'w-10 h-10 rounded-[11px]' : 'w-11 h-11 rounded-xl';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${box} bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-sm transition-transform disabled:opacity-50 disabled:active:scale-100`}
    >
      {icon}
    </button>
  );
};
