# Encore 1 Dessert

App interne (PWA mobile) de gestion des coûts, des commandes et des ventes d'une pâtisserie artisanale. Usage privé, non référencé.

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

Autres commandes : `npm run build`, `npm run lint` (typage).

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Supabase, déploiement Vercel.

## Base de données

Les scripts SQL à exécuter dans Supabase sont dans `supabase/migrations/`.

Guide technique et règles métier : `CLAUDE.md`.
