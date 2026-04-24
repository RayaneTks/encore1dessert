import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { ToastData } from '../types';

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const icons = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-emerald-600',
  error: 'bg-red-500',
  info: 'bg-gourmand-biscuit',
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-0 right-0 z-[300] flex flex-col items-center gap-2 pointer-events-none max-w-[430px] mx-auto px-4">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastData; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`pointer-events-auto w-full ${colors[toast.type]} text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl`}
    >
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon size={14} strokeWidth={3} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        {toast.emphasis ? (
          <p className="text-base font-extrabold leading-tight">{toast.emphasis}</p>
        ) : null}
        <p className={`text-sm font-bold ${toast.emphasis ? 'mt-1 opacity-95' : ''}`}>{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-60 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
