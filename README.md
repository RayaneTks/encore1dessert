# Encore 1 Dessert - Management & Costing 🍩

Une application ultra-premium de gestion de coûts de revient et de pilotage financier, développée sur mesure pour les métiers de la pâtisserie et de la restauration. Pensée en priorité pour les environnements mobiles et d'une fluidité parfaite grâce à un design "Quiet Luxury". 

## 🚀 Fonctionnalités Clés

- **Pilotage Financier Actif** : Un tableau de bord comptable complet (Dashboard) pour suivre le chiffre d'affaires, le bénéfice NET et l'évolution globale des marges.
- **Formulation Dynamique** : Modifiez un grammage dans une fiche technique et consultez son impact instantané sur la marge grâce au calculateur de coût direct ancré en temps réel.
- **Gestion Pâtissière Modulaire** : Référencez vos matières premières (Beurre, Farine...) et créez des bases semi-finies (Pâte sucrée, praliné) pour les assembler dans vos fiches produits finaux.
- **Données Sécurisées (Cloud)** : Synchronisation continue et automatique grâce à une architecture de données relationnelle via **Supabase**. Finie la perte de données liées au navigateur !
- **Design "Quiet Luxury"** : Interface épurée, ultra-contrastée, axée sur les typographies modernes afin de favoriser la lecture des chiffres et la rapidité d'exécution.

## 🛠️ Stack Technique

- **Frontend** : React 19 + Vite + TypeScript
- **Styling** : Tailwind CSS v4 (avec support fluide v4)
- **Base de données & Backend** : Supabase (PostgreSQL + API)
- **Déploiement** : Vercel
- **Animations** : Framer Motion
- **Icônes** : Lucide React

## 📦 Installation & Démarrage

1. Clonez ce dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez vos clés **Supabase** dans le fichier `.env` à la racine :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   ```
   *(Si le projet est relié via Vercel, utilisez `vercel env pull` et assurez-vous d'avoir exporté les clés).*
4. Lancez le serveur localement :
   ```bash
   npm run dev
   ```

## 🎨 L'esthétique "Quiet Luxury"

L'interface tranche avec les standards saturés :  
- **Stone / Neutral 50 & 900** : Les teintes de fond et de textes maximisent la clarté (AAA WCAG) sans heurter la rétine.
- **Discrétion Visuelle** : Bords délicatement arrondis (`Rounded-xl`), ombres organiques subtiles et absence d'animations cartoonesques.
- **Focus Métier** : Rien n'est plus grand ou gras que le chiffre le plus important à l'écran. 

---
*Développé avec exigence pour Encore 1 Dessert.*
