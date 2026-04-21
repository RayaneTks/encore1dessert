import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Tab,
  RawIngredient,
  Base,
  Dessert,
  HistoryEntry,
  Commande,
  ToastData,
} from './types';
import {
  calculateDessertCost,
  createFullSnapshot,
} from './lib/calculations';
import * as db from './lib/db';
import { checkAndFireNotifications, syncAllNotifications } from './lib/notifications';

import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';

import { CalculateScreen } from './screens/CalculateScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { BasesScreen } from './screens/BasesScreen';
import { DessertsScreen } from './screens/DessertsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { CommandesScreen } from './screens/CommandesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { InstallPrompt } from './components/InstallPrompt';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculate');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [loading, setLoading] = useState(true);

  const [ingredients, setIngredients] = useState<RawIngredient[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [desserts, setDesserts] = useState<Dessert[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [targetMargin, setTargetMargin] = useState<number>(() => {
    const s = localStorage.getItem('e1d_target_margin');
    return s ? parseFloat(s) : 0.65;
  });

  // ─── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Initial Fetch ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ings, bs, ds, hs, cmds] = await Promise.all([
        db.fetchIngredients(),
        db.fetchBases(),
        db.fetchDesserts(),
        db.fetchHistory(),
        db.fetchCommandes(),
      ]);
      setIngredients(ings);
      setBases(bs);
      setDesserts(ds);
      setHistory(hs);
      setCommandes(cmds);
      syncAllNotifications(cmds);
      checkAndFireNotifications(cmds);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Erreur de chargement depuis Supabase', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── CRUD Wrappers (sync local state + Supabase) ──────────

  // Ingredients
  const handleSaveIngredient = useCallback(async (ing: RawIngredient) => {
    try {
      const saved = await db.upsertIngredient(ing);
      setIngredients(prev => {
        const idx = prev.findIndex(i => i.id === ing.id);
        if (idx >= 0) return prev.map(i => i.id === ing.id ? saved : i);
        return [...prev, saved];
      });
      return saved;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
      return null;
    }
  }, [showToast]);

  const handleDeleteIngredient = useCallback(async (id: string) => {
    try {
      await db.deleteIngredient(id);
      setIngredients(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  // Bases
  const handleSaveBase = useCallback(async (base: Base) => {
    try {
      const saved = await db.upsertBase(base);
      setBases(prev => {
        const idx = prev.findIndex(b => b.id === base.id);
        if (idx >= 0) return prev.map(b => b.id === base.id ? saved : b);
        return [...prev, saved];
      });
      return saved;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
      return null;
    }
  }, [showToast]);

  const handleDeleteBase = useCallback(async (id: string) => {
    try {
      await db.deleteBase(id);
      setBases(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  // Desserts
  const handleSaveDessert = useCallback(async (dessert: Dessert) => {
    try {
      const saved = await db.upsertDessert(dessert);
      setDesserts(prev => {
        const idx = prev.findIndex(d => d.id === dessert.id);
        if (idx >= 0) return prev.map(d => d.id === dessert.id ? saved : d);
        return [...prev, saved];
      });
      return saved;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
      return null;
    }
  }, [showToast]);

  const handleDeleteDessert = useCallback(async (id: string) => {
    try {
      await db.deleteDessert(id);
      setDesserts(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  // History
  const addHistoryEntry = useCallback(async (dessert: Dessert, quantity: number, overridePrice?: number) => {
    const unitCost = calculateDessertCost(dessert, ingredients, bases);
    const unitPrice = overridePrice || dessert.sellPrice;
    const totalRevenue = unitPrice * quantity;
    const totalCost = unitCost * quantity;
    const totalProfit = totalRevenue - totalCost;
    const marginRate = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
    const linesSnapshot = createFullSnapshot(dessert, ingredients, bases);

    try {
      const saved = await db.insertHistoryEntry({
        dessertId: dessert.id,
        dessertName: dessert.name,
        dessertEmoji: dessert.emoji,
        quantitySold: quantity,
        unitCost, unitPrice, totalRevenue, totalCost, totalProfit, marginRate,
        linesSnapshot,
      });
      setHistory(prev => [saved, ...prev]);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de l\'enregistrement', 'error');
    }
  }, [ingredients, bases, showToast]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      await db.deleteHistoryEntry(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  // Commandes
  const handleSaveCommande = useCallback(async (cmd: Commande) => {
    try {
      const saved = await db.upsertCommande(cmd);
      setCommandes(prev => {
        const updated = (() => {
          const idx = prev.findIndex(c => c.id === cmd.id);
          if (idx >= 0) return prev.map(c => c.id === cmd.id ? saved : c);
          return [...prev, saved];
        })();
        syncAllNotifications(updated);
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    }
  }, [showToast]);

  const handleChangeTargetMargin = useCallback((val: number) => {
    localStorage.setItem('e1d_target_margin', val.toString());
    setTargetMargin(val);
  }, []);

  const handleDeleteCommande = useCallback(async (id: string) => {
    try {
      await db.deleteCommande(id);
      setCommandes(prev => {
        const updated = prev.filter(c => c.id !== id);
        syncAllNotifications(updated);
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gourmand-chocolate border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gourmand-biscuit text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container font-sans text-gourmand-chocolate selection:bg-gourmand-chocolate/10">
      <InstallPrompt />
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'calculate' && (
            <CalculateScreen
              key="calculate"
              desserts={desserts}
              ingredients={ingredients}
              bases={bases}
              commandes={commandes}
              setActiveTab={setActiveTab}
              targetMargin={targetMargin}
              onValidate={addHistoryEntry}
              showToast={showToast}
            />
          )}
          {activeTab === 'desserts' && (
            <DessertsScreen
              key="desserts"
              desserts={desserts}
              ingredients={ingredients}
              bases={bases}
              onSave={handleSaveDessert}
              onDelete={handleDeleteDessert}
              showToast={showToast}
            />
          )}
          {activeTab === 'bases' && (
            <BasesScreen
              key="bases"
              bases={bases}
              ingredients={ingredients}
              onSave={handleSaveBase}
              onDelete={handleDeleteBase}
              showToast={showToast}
            />
          )}
          {activeTab === 'ingredients' && (
            <IngredientsScreen
              key="ingredients"
              ingredients={ingredients}
              onSave={handleSaveIngredient}
              onDelete={handleDeleteIngredient}
              showToast={showToast}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              key="history"
              history={history}
              commandes={commandes}
              setActiveTab={setActiveTab}
              onDelete={handleDeleteHistory}
              showToast={showToast}
            />
          )}
          {activeTab === 'commandes' && (
            <CommandesScreen
              key="commandes"
              commandes={commandes}
              desserts={desserts}
              onSave={handleSaveCommande}
              onDelete={handleDeleteCommande}
              onAddSale={addHistoryEntry}
              showToast={showToast}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              key="settings"
              targetMargin={targetMargin}
              onChangeTargetMargin={handleChangeTargetMargin}
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
