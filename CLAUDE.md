# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📱 Project Philosophy & Design Directives (iOS App Focus)

This application is a **mobile-first iOS utility** for artisanal pastry cost management. It replaces Excel for tracking raw material costs, recipe compositions, dessert pricing, and sales accounting.

**Key Design Principles:**
1.  **Mobile-First/iOS Shell:** Fixed 430px container with safe area insets. Bottom navigation bar always sticky.
2.  **Apple Gourmand Design System:** Palette defined via CSS custom properties in `src/index.css` — Chocolate (#2D1B12), Strawberry (#E94E4E), Biscuit (#C89666), Cream (#F5F2ED).
3.  **UX:** Smooth Framer Motion transitions. Every entity clickable/editable. Toast notifications for feedback. ConfirmDialog for destructive actions.
4.  **Data Architecture:** All types in `src/types/index.ts`. History entries use immutable snapshots with resolved names and frozen prices.

## 🏗️ Architecture Overview

* **Stack:** React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + Lucide React
* **Config:** `vite.config.ts`, `tsconfig.json` (strict mode, src-scoped)
* **Data Persistence:** Supabase (PostgreSQL). No localStorage for data — only for notification schedule (`e1d_notif_schedule_v1`).

### Directory Structure

```
src/
├── components/    # PageHeader, Modal, BottomNav, SectionCard, SettingsRow, Toast, ConfirmDialog, InstallPrompt
├── data/          # initialData.ts (seed data)
├── lib/
│   ├── calculations.ts   # cost engine, snapshots, stats
│   ├── db.ts             # Supabase CRUD (fetchX, upsertX, deleteX)
│   ├── notifications.ts  # local notification schedule (localStorage)
│   └── supabase.ts       # Supabase client init
├── screens/       # Calculate, Ingredients, Bases, Desserts, History, Commandes, Settings
├── types/         # TypeScript interfaces
├── App.tsx        # State orchestration + Supabase fetch on mount
├── index.css      # Tailwind v4 @theme + utility classes
└── main.tsx       # React 19 entry point + SW registration
public/
└── sw.js          # Service worker (PWA)
```

### Key Concepts

* **Matières Premières** (Ingredients): Raw purchased materials with price/kg
* **Bases** (Preparations): House-made components from ingredients (e.g., caramel, dough)
* **Desserts**: Finished products composed of bases + direct ingredients, with sell price
* **History**: Immutable sale records with `SnapshotLine[]` — prices frozen at time of sale
* **Commandes**: Advance client orders. Each commande has multiple `CommandeItem[]` (dessert + quantity), delivery date, status (pending/ready/delivered), and local notification preferences (`notifyBefore: NotifyBefore[]`).
* **Propagation**: Changing an ingredient price auto-recalculates all bases and desserts that use it

## 🗄️ Supabase Schema

Tables: `raw_ingredients`, `bases`, `base_components`, `desserts`, `dessert_components`, `history_entries`, `commandes`

**commandes** columns: `id, client_name, items (JSONB), order_date, delivery_date, notes, status, notify_before (JSONB), created_at`

**Notifications**: Local only (fires when app is open). `notify_before` = `[0, 1, 2]` = same day / 1 day before / 2 days before at 8:00. Schedule stored in `localStorage['e1d_notif_schedule_v1']`.

## 🛠️ Development & Build Commands

* **Install:** `npm install`
* **Start Dev Server:** `npm run dev`
* **Type Check:** `npx tsc --noEmit`
* **Build for Production:** `npm run build`

## 🧩 CSS System

Tailwind CSS v4 with `@theme` directive. Two card variants:
* `.gourmand-card` — White background, rounded-[32px], border
* `.gourmand-card-dark` — Chocolate background, white text (uses CSS var to avoid Tailwind specificity issues)

## ⚠️ Key Constraints

* **ConfirmDialog** has no `isOpen` prop — wrap in `<AnimatePresence>` and conditionally render
* **BottomNav** has 6 tabs (flex-1, icon size 20) — adding a 7th requires redesign
* **Notifications** are local only (fire on app open). Background push requires VAPID + server — not implemented
* **SectionCard** uses `mb-0` — spacing handled by parent `space-y-*`. Do NOT add `mb-6` back; all screens use `space-y-3` or `space-y-4` containers
* **SectionCard padding=true** → `p-4`. Use `padding={false}` for list-based content (divide-y rows handle their own padding)
* **Reset button** (SettingsScreen) clears localStorage only (`e1d_target_margin` + `e1d_notif_schedule_v1`) — does NOT touch Supabase data. Confirmation text must make this explicit
* **Tout est net** — no TVA, no gross/net distinction. All amounts are net. Never add tax rows
* **targetMargin** persisted in `localStorage['e1d_target_margin']` (default 0.65). Lifted to App.tsx state, passed as prop to CalculateScreen + SettingsScreen
* **StatPeriod** (`'week' | 'month' | 'all'`) — `filterHistoryByPeriod()` in `calculations.ts`. Dashboard defaults to `'month'`
* **Commande → Vente**: when advancing status to `delivered`, intercept and offer modal with "Enregistrer + Livrer" / "Livrer uniquement". Loops `commande.items`, calls `onAddSale(dessert, qty)` per item
