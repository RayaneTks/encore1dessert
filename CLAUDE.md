# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📱 Project Philosophy & Design Directives (iOS App Focus)

This application is a **mobile-first iOS utility** for artisanal pastry cost management. It replaces Excel for tracking raw material costs, recipe compositions, dessert pricing, and sales accounting.

**Key Design Principles:**
1.  **Mobile-First/iOS Shell:** Fixed 430px container with safe area insets. Bottom navigation bar always sticky.
2.  **Apple Gourmand Design System:** Palette defined via CSS custom properties in `src/index.css` — Chocolate (#2D1B12), Strawberry (#E94E4E), Biscuit (#C89666), Cream (#F5F2ED).
3.  **UX:** Smooth Framer Motion transitions. Every entity clickable/editable. Toast notifications for feedback. ConfirmDialog for destructive actions.
4.  **Data Architecture:** Prepared for future DB migration. All types in `src/types/index.ts`. History entries use immutable snapshots with resolved names and frozen prices.

## 🏗️ Architecture Overview

* **Stack:** React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + Lucide React
* **Config:** `vite.config.ts`, `tsconfig.json` (strict mode, src-scoped)
* **Data Persistence:** localStorage with `e1d_*_v2` keys

### Directory Structure

```
src/
├── components/    # Reusable UI: PageHeader, Modal, BottomNav, SectionCard, SettingsRow, Toast, ConfirmDialog
├── data/          # Initial data (initialData.ts)
├── lib/           # Business logic (calculations.ts) — cost engine, snapshots, stats
├── screens/       # Full-screen views: Calculate, Ingredients, Bases, Desserts, History, Settings
├── types/         # TypeScript interfaces (DB-ready)
├── App.tsx        # State orchestration + localStorage persistence
├── index.css      # Tailwind v4 @theme + utility classes
└── main.tsx       # React 19 entry point
```

### Key Concepts

* **Matières Premières** (Ingredients): Raw purchased materials with price/kg
* **Bases** (Preparations): House-made components from ingredients (e.g., caramel, dough)
* **Desserts**: Finished products composed of bases + direct ingredients, with sell price
* **History**: Immutable sale records with `SnapshotLine[]` — prices frozen at time of sale
* **Propagation**: Changing an ingredient price auto-recalculates all bases and desserts that use it

## 🛠️ Development & Build Commands

* **Install:** `npm install`
* **Start Dev Server:** `npm run dev`
* **Type Check:** `npx tsc --noEmit`
* **Build for Production:** `npm run build`

## 🧩 CSS System

Tailwind CSS v4 with `@theme` directive. Two card variants:
* `.gourmand-card` — White background, rounded-[32px], border
* `.gourmand-card-dark` — Chocolate background, white text (uses CSS var to avoid Tailwind specificity issues)