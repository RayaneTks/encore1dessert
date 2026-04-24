import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex max-h-[100dvh] items-end justify-center overflow-x-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pb-8"
    >
      <div className="absolute inset-0 bg-gourmand-chocolate/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        exit={{ y: 24 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative flex max-h-[min(92dvh,720px)] w-full max-w-[min(100%,400px)] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gourmand-border px-4 py-4 sm:px-5">
          <h3 id="modal-title" className="min-w-0 flex-1 text-lg font-bold leading-tight tracking-tight sm:text-xl">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gourmand-bg transition-colors hover:bg-gourmand-border/40 active:opacity-80"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-scroll min-h-0 flex-1 overscroll-contain px-4 py-4 sm:px-5">{children}</div>
      </motion.div>
    </motion.div>
  );
};
