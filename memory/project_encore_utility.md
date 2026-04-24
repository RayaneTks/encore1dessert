---
name: Projet Encore1Dessert (iOS Utility App)
description: Architecture, objectifs et contraintes UX/UI pour un outil personnel iOS-first de remplacement Excel, nécessitant une expérience fluide et dense.
type: project
---

**Core Goal:** To build a highly functional, production-grade utility app that replaces an Excel spreadsheet for internal, private use. The focus must shift from a "showcase" app to a reliable, data-dense *tool*.

**Design & UX Directives (Apple iOS Native):**
*   **Shell Constraint:** The application must *always* respect a fixed, immersive mobile shell, acknowledging safe areas (notch/Dynamic Island). The entire application flow must behave as if it were installed via the Home Screen, even when accessed via a browser URL.
*   **Fluidity is Paramount:** All state changes and view transitions must be exceptionally smooth and polished (minimal jarring movements). Focus on *micro-interactions* that feel natural to iOS.
*   **Information Density:** Content must be tightly packed, maximizing screen real estate without becoming overwhelming.
*   **Aesthetics:** The design must be clean, minimal, and sophisticated, matching Apple's design language. **Crucially, avoid all generic "AI-generated" aesthetics** (e.g., overly bright colors, decorative, large white logo blocks).
*   **Content:** Remove all superfluous text or descriptive copy that doesn't directly contribute to the utility function.

**Technical Constraints:**
*   **Build Target:** The deployment target is Vercel/iOS PWA structure. The build command `npm run build` must pass successfully.
*   **Logo Optimization:** `src/assets/logo.png` is flagged as a performance bottleneck due to size and requires dedicated optimization when possible.
*   **Responsiveness:** The UI must gracefully handle two modes: 1) Installed PWA (best experience) and 2) Direct URL access (must remain fully usable, even if slightly less optimized than the PWA).

**Workflow Requirement:**
When undertaking major UI/UX overhauls, always leverage the specialized skills available in the `.skills` directory (e.g., `frontend-design`, `ui-ux-pro-max`).

**Métier — Ordres vs Compta (règles produit)**
* **Onglet Ordres** : liste opérationnelle. Une commande **livrée** disparaît de cette liste dès le **lendemain (J+1)** du jour enregistré comme date de livraison réelle (`deliveryDate` au passage en *Livrée*). Les données restent en base ; l’historique de vente reste dans la Compta.
* **Dates** : `src/lib/dateLocal.ts` — `toCalendarISODate` normalise toute date (évite les bugs de comparaison texte ex. `2026-4-24` vs `2026-04-25`) ; le filtre d’exclusion des livrées utilise cette forme. Rafraîchissement du « jour calendaire » côté écran Commandes (intervalle + retour d’onglet).
* **Compta immuable** : les enregistrements `history_entries` sont des instantanés (prix, légendes, offre au moment de la vente). **Supprimer une commande** ne supprime pas les tickets compta. Pas de recalcul rétroactif si le catalogue ou les offres changent. Doc détaillée : `CLAUDE.md` (sections History / Commandes / contraintes).