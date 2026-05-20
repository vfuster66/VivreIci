# Application `vivreici-collectivites`

## Rôle dans l’écosystème

C’est **l’application bureau réservée aux comptes « mairie »** (rôle `mairie` dans `app_admins`). Elle permet de **visualiser la synthèse du territoire** et de **traiter la file des signalements** limités au périmètre de la collectivité (territoire / `territory_key`), en cohérence avec ce qui est promis sur **`vivreici-site-collectivites`** (carte, statuts, historique côté produit).

**Public cible :** agents municipaux, élus ou prestataires habilités avec un compte **mairie**.

**Port de développement habituel :** `3004` (`pnpm dev` dans ce dossier).

---

## Ce qu’elle doit faire (fonctionnel)

### Authentification

- **Connexion** / **déconnexion** Supabase (même projet que le reste de la plateforme).
- **Mot de passe oublié** et **réinitialisation** (même parcours que l’admin, sur cette origine).

### Garde d’accès (`/admin`)

- Sous **`/admin`**, seuls les utilisateurs avec le rôle **`mairie`** sont autorisés.
- Les rôles **admin** et **superadmin** sont **redirigés** vers la console plateforme (`NEXT_PUBLIC_PLATFORM_ADMIN_URL`, ex. `http://localhost:3001`), car leur périmètre est `vivreici-admin`.
- Utilisateur non connecté → redirection vers **`/connexion`** avec retour prévu vers `/admin`.

### Synthèse territoire

- **`/admin`** : tableau de bord **Vue d’ensemble** adapté au rôle mairie (indicateurs ouverts / en cours / résolus, liens vers la file signalements du territoire).
- Données via **`/api/admin/overview`** (même logique métier que l’admin, filtrée par territoire pour la mairie).

### Signalements du territoire

- **`/admin/collectivites`** : liste et carte des signalements **du territoire de la mairie** (mode « mairie » côté composant reports).
- Actions de **suivi** (statuts, visibilité, etc.) dans les limites autorisées par les **RLS** et l’API **`/api/admin/reports`**.

### Expérience utilisateur

- Interface **desktop** claire (layout type bureau, sidebar « **Espace collectivité** »).
- Libellés et parcours alignés sur une **collectivité** qui pilote son territoire, pas sur un super-administrateur.

---

## Ce qu’elle ne doit pas faire (état actuel volontairement réduit)

- **Pas** de gestion globale des **utilisateurs** plateforme, **journal d’audit** complet, **entraide** / **animaux** / **alertes animales** au niveau plateforme : ces modules vivent dans **`vivreici-admin`**.
- **Pas** de page marketing : l’**acquisition** et la **démo commerciale** sont sur **`vivreici-site-collectivites`**.

Si le métier exige plus tard des écrans mairie sur l’entraide ou les animaux **localisés au territoire**, on pourra les réintroduire ici ou via un package partagé — à trancher produit / roadmap.

---

## Technique (rappels)

- **Framework :** Next.js (App Router), TypeScript.
- **Auth / données :** Supabase, mêmes variables d’environnement que `vivreici-admin` pour le projet (URL + clé anon ; cookies sur **cette** origine uniquement).
- **Variables utiles :**
  - `NEXT_PUBLIC_PLATFORM_ADMIN_URL` : URL de `vivreici-admin` pour rediriger les non-mairies.
  - `NEXT_PUBLIC_CITIZEN_APP_URL` (ou équivalent) : liens vers l’app citoyenne depuis certains écrans.

Fichier d’exemple : `vivreici-collectivites/.env.example`.

---

## Relation avec le site marketing collectivités

- Le site **`vivreici-site-collectivites`** doit pointer vers cette app pour les CTA du type **« Accéder à la plateforme »** via `NEXT_PUBLIC_COLLECTIVITES_APP_URL` (défaut local `http://localhost:3004`).

---

## Fichiers clés à connaître

- `app/admin/layout.tsx` : garde rôle `mairie`.
- `app/admin/page.tsx` + `components/admin/AdminOverviewPage.tsx`.
- `app/admin/collectivites/page.tsx` + `components/admin/AdminReportsPage.tsx` (mode `mairie`).
- `app/api/admin/overview`, `app/api/admin/reports`.
