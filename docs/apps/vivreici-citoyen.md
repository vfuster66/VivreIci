# Application `vivreici-citoyen`

## Rôle dans l’écosystème

C’est **l’application utilisée par les habitants** : consultation de la carte, création et suivi de signalements, alertes locales, entraide, animaux, compte et notifications. Elle consomme le **même projet Supabase** que les apps bureau (données partagées avec la modération et les collectivités).

**Public cible :** résidents, usagers mobiles et desktop (PWA possible selon configuration).

**Port de développement habituel :** `3000` (script `next dev` par défaut).

---

## Ce qu’elle doit faire (fonctionnel)

### Carte et territoire

- Afficher une **carte interactive** (Leaflet / OpenStreetMap) avec les signalements et éléments pertinents du territoire.
- Permettre la **navigation** et l’**accès aux fiches** depuis la carte.

### Signalements citoyens

- **Liste** des signalements (filtres / onglets selon l’implémentation actuelle).
- **Création** d’un nouveau signalement (formulaire, géolocalisation, médias si prévu).
- **Détail** d’un signalement (`/signalements/[id]`).
- Respect des règles **métier** (statuts, visibilité, territoire) alignées sur la base Supabase.

### Alertes

- Page **alertes** : informer sur les alertes locales utiles (selon le modèle de données en place).

### Animaux

- Espace **animaux** : annonces / alertes animales (perdus, vigilance, etc.) en lien avec les migrations et politiques RLS.

### Entraide

- Parcours **entraide** (demandes / offres) cohérent avec les tables `help_posts` (ou équivalent).

### Compte et auth

- **Inscription**, **connexion**, **mot de passe oublié** / **réinitialisation**.
- **Profil** utilisateur.
- **Confidentialité** (page dédiée).
- Session **Supabase Auth** ; pas d’accès aux écrans d’administration plateforme ou mairie.

### Notifications

- **Centre de notifications** (lecture, état lu/non lu selon l’implémentation).

### Accueil

- **Page d’accueil** orientée usage citoyen (accès rapide carte, signalements, modules principaux).

---

## Ce qu’elle ne doit pas faire

- Ne pas exposer les **outils de modération globale** ni la **gestion des autres utilisateurs** (réservés à `vivreici-admin`).
- Ne pas remplacer l’**espace mairie** (`vivreici-collectivites`) : pas de pilotage « collectivité » ici.
- Ne pas héberger la **landing marketing B2B** (voir `vivreici-site-collectivites` et `vivreici-site-vitrine`).

---

## Technique (rappels)

- **Framework :** Next.js (App Router), React, TypeScript.
- **Données / auth :** Supabase (`@supabase/ssr`, client navigateur + serveur).
- **Carte :** `react-leaflet`, `leaflet`.
- **UI :** composants type shadcn / thème (`next-themes`).

---

## Évolution souhaitable (hors périmètre strict)

- Renforcer **PWA** (manifest, hors-ligne partiel) si la roadmap le prévoit.
- **Lien vers le site vitrine** pour pages légales ou « à propos » si les URLs sont externalisées (`NEXT_PUBLIC_MARKETING_SITE_URL` ou équivalent côté citoyen).

---

## Fichiers clés à connaître

- `app/` : routes par feature (`carte`, `signalements`, `alertes`, `animaux`, `entraide`, etc.).
- `lib/` : accès données, règles métier, clients Supabase.
- `components/` : shell app, carte, listes, formulaires.

Pour la vision produit globale, voir [`roadmap.md`](../../roadmap.md) à la racine du dépôt.
