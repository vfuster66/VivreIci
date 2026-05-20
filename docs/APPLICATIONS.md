# Applications VivreIci (vue d’ensemble)

Documentation **détaillée par app** : une fiche par dossier dans [`docs/apps/`](./apps/).

| Dossier | Rôle en une phrase | Port dev (défaut) | Fiche |
|--------|-------------------|-------------------|--------|
| **`vivreici-citoyen`** | App habitants : carte, signalements, alertes, entraide, animaux, compte. | `3000` | [**vivreici-citoyen.md**](apps/vivreici-citoyen.md) |
| **`vivreici-collectivites`** | App **mairie** : synthèse territoire + file signalements (rôle `mairie` uniquement sous `/admin`). | `3004` | [**vivreici-collectivites.md**](apps/vivreici-collectivites.md) |
| **`vivreici-admin`** | **Administration plateforme** (`superadmin` / `admin`) : modération globale, utilisateurs, accès, journal, entraide, animaux. | `3001` | [**vivreici-admin.md**](apps/vivreici-admin.md) |
| **`vivreici-site-vitrine`** | Site marketing grand public + pages légales. | `3002` | [**vivreici-site-vitrine.md**](apps/vivreici-site-vitrine.md) |
| **`vivreici-site-collectivites`** | Landing marketing **B2B collectivités** (offre, tarifs, FAQ, CTA vers l’app mairie). | `3003` | [**vivreici-site-collectivites.md**](apps/vivreici-site-collectivites.md) |

---

## Auth et origines (rappel)

Chaque app Next = **origine** distincte (`localhost:PORT`). Les sessions Supabase sont **par app** : en local, connexion sur l’URL correspondante (mairie → `3004`, équipe plateforme → `3001`, habitant → `3000`).

Sous **`vivreici-collectivites`**, seul le rôle **`mairie`** accède à `/admin` ; les autres rôles sont renvoyés vers `NEXT_PUBLIC_PLATFORM_ADMIN_URL` (défaut `http://localhost:3001`).

---

## Variables transverses (rappel)

- **Landing collectivités → app mairie :** `NEXT_PUBLIC_COLLECTIVITES_APP_URL` (secours : `NEXT_PUBLIC_ADMIN_APP_URL`).
- **App collectivités → console plateforme :** `NEXT_PUBLIC_PLATFORM_ADMIN_URL`.
- **Apps avec données :** mêmes clés Supabase (`NEXT_PUBLIC_SUPABASE_*`, etc.) sur le **même projet** pour citoyen, collectivités et admin.

Le détail par projet est dans chaque fiche **`docs/apps/*.md`** et les `.env.example` à la racine des dossiers concernés.

---

## Vision produit globale

Pour les phases, priorités et modèle de données : [`roadmap.md`](../roadmap.md) à la racine du dépôt.
