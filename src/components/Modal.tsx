import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-12 sm:pb-32 lg:pb-12"
    >
      <div className="absolute inset-0 bg-gourmand-chocolate/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="relative w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gourmand-border flex justify-between items-center">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gourmand-bg flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};
