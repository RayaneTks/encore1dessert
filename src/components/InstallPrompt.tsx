import React, { useEffect, useState } from 'react';
import { Share, PlusSquare, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export const InstallPrompt: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android/i.test(userAgent);
    setIsMobile(isMobileDevice);

    setIsIOS(/iphone|ipad|ipod/i.test(userAgent));

    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // Safari iOS legacy check
      const isStandaloneNavigator = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isStandaloneNavigator;
    };

    setIsStandalone(checkStandalone());
  }, []);

  if (!isMobile || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gourmand-bg flex items-center justify-center p-6 text-gourmand-chocolate selection:bg-gourmand-chocolate/10 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6"
      >
        <div className="w-20 h-20 bg-gourmand-bg rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Smartphone size={40} className="text-gourmand-chocolate" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Installez l'application</h2>
          <p className="text-sm text-gourmand-cocoa/80 leading-relaxed font-medium">
            Pour une expérience optimale et sécurisée, Encore1Dessert doit être installé sur votre écran d'accueil.
          </p>
        </div>

        <div className="bg-gourmand-bg rounded-xl p-5 text-left space-y-4">
          {isIOS ? (
             <div className="space-y-4 text-sm font-medium text-gourmand-chocolate">
                <p className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                    <Share size={18} />
                  </span>
                  Appuyez sur "Partager" au milieu de votre menu Safari.
                </p>
                <p className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                    <PlusSquare size={18} />
                  </span>
                  Choisissez "Sur l'écran d'accueil".
                </p>
             </div>
          ) : (
             <div className="space-y-4 text-sm font-medium text-gourmand-chocolate">
               <p className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 font-bold">
                    ⋮
                  </span>
                  Ouvrez le menu de votre navigateur Android.
                </p>
                <p className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                    <PlusSquare size={18} />
                  </span>
                  Choisissez "Ajouter à l'écran d'accueil".
                </p>
             </div>
          )}
        </div>
        <p className="text-[10px] font-semibold text-gourmand-biscuit uppercase tracking-widest pt-2">L'accès web classique est désactivé sur mobile.</p>
      </motion.div>
    </div>
  );
};
