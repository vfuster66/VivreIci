# VivreIci

## 🧭 Vision

VivreIci est une application hyper-locale pensée pour améliorer la vie quotidienne à Cabestany en combinant :

- le **signalement citoyen**
- les **alertes locales utiles**
- l’**entraide de proximité**
- les **alertes animales et la vigilance terrain**
- la **mise en visibilité de la vie locale**
- une future **lecture factuelle de l’état du territoire**

L’objectif n’est pas de tout lancer d’un coup, mais de construire progressivement une application crédible, utile et adoptée.

## 🧩 Piliers du Produit

À terme, VivreIci repose sur 6 piliers :

1.  **Signalement** : Remonter les problèmes du quotidien.
2.  **Carte** : Voir le territoire de manière visuelle et vivante.
3.  **Alertes** : Informer utilement les habitants.
4.  **Animaux** : Protéger, prévenir et aider à retrouver.
5.  **Entraide** : Créer du lien de proximité.
6.  **Impact** : Montrer ce qui évolue et ce qui compte.

## 🚀 Roadmap Stratégique

Le lancement du produit est progressif. L'ordre stratégique recommandé est le suivant :

1.  Signalement & Carte
2.  Anti-doublon & Validation communautaire
3.  Alertes locales
4.  Animaux (Vigilance & Perdus/Trouvés)
5.  Entraide de proximité
6.  Preuve d’impact et engagement

## 📚 Documentation

Afin de garder une documentation claire et sans redondance, le projet est documenté en deux fichiers distincts :

- [**Dossier de Conception & Roadmap (`roadmap.md`)**](roadmap.md) : Vision détaillée, découpage en phases, stratégie de lancement et architecture de données (SQL).
- **Design System & UX (`design.md`)** : Charte graphique, principes d'interface, parcours utilisateurs (onboarding, signalement) et gestion des états visuels.

## 💻 Stack Technique

| Couche       | Technologie             | Rôle                            |
| ------------ | ----------------------- | ------------------------------- |
| Frontend     | Next.js                 | application web / PWA           |
| Backend      | Supabase                | base de données, auth, realtime |
| Stockage     | Supabase Storage        | photos                          |
| Emails       | Resend                  | envois automatiques             |
| Déploiement  | Vercel                  | hébergement                     |
| Cartographie | Leaflet + OpenStreetMap | carte sans coût API             |

---

## 🚀 Démarrage Rapide (Installation Locale)

Suivez ces étapes pour lancer le projet sur votre machine.

### 1. Prérequis

- Node.js (v20.x ou supérieure)
- `pnpm` est recommandé comme gestionnaire de paquets (`npm install -g pnpm`)

### 2. Configuration

Clonez le dépôt, puis créez un fichier de configuration d'environnement local :

```bash
# Copiez l'exemple vers votre fichier local
cp .env.example .env.local
```

Ouvrez le fichier `.env.local` et remplissez les variables avec vos propres clés obtenues depuis Supabase et Resend.

Pour le résumé hebdomadaire, ajoutez aussi :

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `SUPERADMIN_USER`
- `NEXT_PUBLIC_APP_URL`
- `WEEKLY_REPORTS_TEST_MODE`
- `WEEKLY_REPORTS_TEST_EMAIL`
- `WEEKLY_REPORTS_CITY_EMAIL`

Toutes les migrations SQL sont centralisées dans [`supabase/migrations`](./supabase/migrations).

Utilisez ce dossier comme source de vérité, dans l’ordre chronologique des fichiers.

Le dépôt contient notamment :

- l’historique / soft delete
- la table `report_media`
- l’archivage explicite des signalements
- les logs d’emails hebdomadaires

### 3. Installation & Lancement

```bash
# Installez les dépendances
pnpm install

# Lancez le serveur de développement
pnpm dev
```

L'application sera disponible sur http://localhost:3000.

## 🏗️ Architecture du Code

Le projet est structuré pour être évolutif et maintenable, en s'appuyant sur les standards de Next.js.

- **/app**: Cœur de l'application utilisant le **App Router**. Chaque dossier représente une route. Contient les `page.tsx`, `layout.tsx`, `loading.tsx` et `error.tsx`.
- **/components**: Tous les composants React réutilisables.
  - **/components/ui**: Composants d'interface génériques et stylisés (Bouton, Card, Input...). Idéal pour y placer les composants de Shadcn/UI.
  - **/components/specific**: Composants métier spécifiques à VivreIci (ex: `ReportForm`, `InteractiveMap`, `AlertFeed`).
- **/lib**: Fonctions utilitaires, hooks personnalisés et configuration des clients d'API.
  - `lib/supabase.ts`: Initialisation et types du client Supabase.
  - `lib/supabase-admin.ts`: Client Supabase serveur pour cron et agrégations.
  - `lib/weekly-reports.ts`: Agrégation hebdomadaire + templates texte + envoi Resend.
  - `lib/utils.ts`: Fonctions d'aide diverses (formatage de dates, etc.).

## 📬 Résumé hebdomadaire

Le cron hebdomadaire est exposé via `GET /api/cron/weekly-reports`.

- Authentification : header `Authorization: Bearer $CRON_SECRET`
- Dry run : `GET /api/cron/weekly-reports?dryRun=true`
- Envoi réel : `GET /api/cron/weekly-reports`

Le fichier [`vivreici-app/vercel.json`](./vivreici-app/vercel.json) prévoit un passage hebdomadaire le lundi à 06:00 UTC. Ajustez l’horaire si vous voulez coller strictement à l’heure locale France.

Comportement actuel :

- le mail “mairie” est redirigé vers `SUPERADMIN_USER` tant que `WEEKLY_REPORTS_TEST_MODE=true`
- le mail utilisateurs est envoyé à tous les profils inscrits disposant d’un email
