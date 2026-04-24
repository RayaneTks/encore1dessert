import React from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { LayoutDashboard, ChefHat, Calculator, Beaker, Apple, ClipboardList } from 'lucide-react';
import { Tab } from '../types';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'history', label: 'Compta', icon: LayoutDashboard },
  { id: 'commandes', label: 'Ordres', icon: ClipboardList },
  { id: 'calculate', label: 'Vendre', icon: Calculator },
  { id: 'desserts', label: 'Recettes', icon: ChefHat },
  { id: 'bases', label: 'Bases', icon: Beaker },
  { id: 'ingredients', label: 'Matières', icon: Apple },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <nav className="nav-blur h-[88px] fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-1 flex justify-between items-start pt-2 z-[100] safe-area-bottom">
      <LayoutGroup>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={`Ouvrir ${tab.label}`}
            className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gourmand-chocolate/20 ${
              activeTab === tab.id ? 'text-gourmand-chocolate' : 'text-gourmand-biscuit'
            }`}
          >
            <motion.div
              animate={
                reduceMotion
                  ? { scale: 1, y: 0 }
                  : {
                      scale: activeTab === tab.id ? 1.05 : 1,
                      y: activeTab === tab.id ? -2 : 0,
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : { type: 'spring', stiffness: 400, damping: 28 }
              }
            >
              <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            </motion.div>
            <span className={`text-[10px] font-semibold tracking-tight transition-all duration-200 ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </LayoutGroup>
    </nav>
  );
};
