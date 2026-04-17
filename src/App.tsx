import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import {
  Tab,
  RawIngredient,
  Base,
  Dessert,
  HistoryEntry,
  ToastData,
} from './types';
import {
  calculateDessertCost,
  createFullSnapshot,
} from './lib/calculations';

import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';

import { CalculateScreen } from './screens/CalculateScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { BasesScreen } from './screens/BasesScreen';
import { DessertsScreen } from './screens/DessertsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculate');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── State ─────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<RawIngredient[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [desserts, setDesserts] = useState<Dessert[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // ─── Fetching from Supabase ────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // On récupère tout en parallèle
      const [ingRes, baseRes, baseCompRes, dessertRes, dessertCompRes, historyRes] = await Promise.all([
        supabase.from('raw_ingredients').select('*').order('name'),
        supabase.from('bases').select('*').order('name'),
        supabase.from('base_components').select('*'),
        supabase.from('desserts').select('*').order('name'),
        supabase.from('dessert_components').select('*'),
        supabase.from('history_entries').select('*').order('date', { ascending: false })
      ]);

      if (ingRes.data) setIngredients(ingRes.data);
      
      // Reconstruction des bases avec leurs composants
      if (baseRes.data && baseCompRes.data) {
        const fullBases = baseRes.data.map(b => ({
          ...b,
          components: baseCompRes.data
            .filter(bc => bc.base_id === b.id)
            .map(bc => ({ ingredientId: bc.ingredient_id, quantity: bc.quantity }))
        }));
        setBases(fullBases);
      }

      // Reconstruction des desserts avec leurs composants
      if (dessertRes.data && dessertCompRes.data) {
        const fullDesserts = dessertRes.data.map(d => ({
          ...d,
          sellPrice: d.sell_price, // Mapping snake_case to camelCase
          components: dessertCompRes.data
            .filter(dc => dc.dessert_id === d.id)
            .map(dc => ({ type: dc.type, id: dc.base_id || dc.ingredient_id, quantity: dc.quantity }))
        }));
        setDesserts(fullDesserts);
      }

      if (historyRes.data) {
        setHistory(historyRes.data.map(h => ({
           ...h,
           dessertId: h.dessert_id,
           dessertName: h.dessert_name,
           dessertEmoji: h.dessert_emoji,
           quantitySold: h.quantity_sold,
           unitCost: h.unit_cost,
           unitPrice: h.unit_price,
           totalRevenue: h.total_revenue,
           totalCost: h.total_cost,
           totalProfit: h.total_profit,
           marginRate: h.margin_rate,
           linesSnapshot: h.lines_snapshot
        })));
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Sync Wrappers (Remplacement du localStorage par Supabase) ───────────

  const updateIngredients = async (newIngs: RawIngredient[] | ((prev: RawIngredient[]) => RawIngredient[])) => {
    const next = typeof newIngs === 'function' ? newIngs(ingredients) : newIngs;
    setIngredients(next);
    
    // On synchronise avec Supabase (simplifié: on upsert)
    // Pour une vraie app, on ferait des appels atomiques. Ici on gère massivement pour rester fluide.
    for (const ing of next) {
      await supabase.from('raw_ingredients').upsert({
        id: ing.id.includes('ing-') ? undefined : ing.id, // Generate new if temporary
        name: ing.name,
        price_per_kg: ing.pricePerKg,
        unit: ing.unit,
        category: ing.category,
        emoji: ing.emoji,
        purchase_label: ing.purchaseLabel,
        notes: ing.notes
      });
    }
    // Note: On devrait aussi gérer les suppressions ici...
  };

  const updateBases = async (newBases: Base[] | ((prev: Base[]) => Base[])) => {
    const next = typeof newBases === 'function' ? newBases(bases) : newBases;
    setBases(next);
    // Logique de sync...
  };

  // ─── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── History Entry ───────────
  const addHistoryEntry = useCallback(async (dessert: Dessert, quantity: number, overridePrice?: number) => {
    const unitCost = calculateDessertCost(dessert, ingredients, bases);
    const unitPrice = overridePrice || dessert.sellPrice;
    const totalRevenue = unitPrice * quantity;
    const totalCost = unitCost * quantity;
    const totalProfit = totalRevenue - totalCost;
    const marginRate = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      dessertId: dessert.id,
      dessertName: dessert.name,
      dessertEmoji: dessert.emoji,
      quantitySold: quantity,
      unitCost,
      unitPrice,
      totalRevenue,
      totalCost,
      totalProfit,
      marginRate,
      linesSnapshot: createFullSnapshot(dessert, ingredients, bases),
    };

    // Save to Supabase
    const { error } = await supabase.from('history_entries').insert({
      dessert_id: dessert.id.includes('dessert-') ? null : dessert.id,
      dessert_name: dessert.name,
      dessert_emoji: dessert.emoji,
      quantity_sold: quantity,
      unit_cost: unitCost,
      unit_price: unitPrice,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalProfit,
      margin_rate: marginRate,
      lines_snapshot: entry.linesSnapshot
    });

    if (!error) {
      setHistory(prev => [entry, ...prev]);
    } else {
      showToast("Erreur lors de la sauvegarde en base", "error");
    }
  }, [ingredients, bases, showToast]);

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
         <div className="text-center">
            <div className="w-8 h-8 border-4 border-gourmand-chocolate border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gourmand-biscuit text-sm">Chargement de la cave...</p>
         </div>
      </div>
    )
  }

  return (
    <div className="app-container font-sans text-gourmand-chocolate selection:bg-gourmand-chocolate/10">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Screen content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'calculate' && (
            <CalculateScreen
              key="calculate"
              desserts={desserts}
              ingredients={ingredients}
              bases={bases}
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
              setDesserts={setDesserts}
              showToast={showToast}
            />
          )}
          {activeTab === 'bases' && (
            <BasesScreen
              key="bases"
              bases={bases}
              ingredients={ingredients}
              setBases={setBases}
              showToast={showToast}
            />
          )}
          {activeTab === 'ingredients' && (
            <IngredientsScreen
              key="ingredients"
              ingredients={ingredients}
              setIngredients={updateIngredients as any}
              showToast={showToast}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              key="history"
              history={history}
              setHistory={setHistory}
              showToast={showToast}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              key="settings"
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

