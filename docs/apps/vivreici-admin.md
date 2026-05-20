# Application `vivreici-admin` (package `vivreici-admin-plateforme`)

## Rôle dans l’écosystème

C’est la **console d’administration de la plateforme** pour les rôles **`superadmin`** et **`admin`**. Elle permet la **modération globale** des signalements, la **gestion des accès** (qui est admin / mairie / révoqué), le **suivi des utilisateurs**, le **journal** d’actions sensibles, et les modules **entraide** et **animaux** à l’échelle plateforme.

Les comptes **`mairie`** peuvent techniquement se connecter sur cette origine (session distincte du port `3004`), mais le **produit cible** pour la mairie est **`vivreici-collectivites`** ; la sidebar limite déjà le menu mairie à la synthèse + file territoire.

**Public cible :** équipe produit / opérations / support, super-admins.

**Port de développement habituel :** `3001`.

---

## Rôles et périmètre (métier)

| Rôle | Accès typique dans cette app |
|------|------------------------------|
| **superadmin** | Tout : signalements globaux, utilisateurs, **accès** (app_admins), **journal**, entraide, animaux (annonces + alertes). |
| **admin** | Modération signalements, vue large territoire / file, **pas** accès ni journal (selon `AdminSidebar` et routes). |
| **mairie** | Synthèse + entrée **Collectivités** (signalements territoire) ; **recommandation** : utiliser **`vivreici-collectivites`** en prod pour une URL dédiée. |

Les règles fines (RLS Supabase + contrôles dans les `route.ts`) font foi en cas d’écart avec ce tableau.

---

## Ce qu’elle doit faire (par zone fonctionnelle)

### Authentification

- Connexion / déconnexion, mot de passe oublié, réinitialisation (parcours bureau).

### Vue d’ensemble (`/admin`)

- Tableau de bord avec **statistiques** et **cartes de priorité** selon le rôle (volume ouverts, abus, utilisateurs récents pour superadmin/admin ; variante territoire pour mairie si connexion ici).

### Signalements — vue plateforme (`/admin/signalements`)

- File **globale** (mode admin), filtres, pagination, actions de modération (statuts, visibilité carte, signalement d’abus, etc.).

### Signalements — vue type collectivité (`/admin/collectivites`)

- Même moteur de données mais **filtré territoire** pour le rôle mairie (utile si la mairie passe encore par le port 3001).

### Entraide (`/admin/entraide`)

- Modération / pilotage des **annonces d’entraide** (help posts).

### Animaux

- **`/admin/animaux-annonces`** : annonces perdus / trouvés / repérages.
- **`/admin/animaux-alertes`** : alertes animales (gravité, vérification, etc.).

### Utilisateurs (`/admin/utilisateurs`) — superadmin

- Liste des comptes, stats agrégées, actions de gestion prévues par l’UI (création, reset, etc., selon implémentation).

### Accès (`/admin/acces`) — superadmin

- Gestion des **membres admin** (rôles, territoires, organisations) via API **`/api/admin/members`**.

### Journal (`/admin/journal`) — superadmin

- **Audit** / historique d’événements sensibles (API **`/api/admin/journal`**).

### APIs associées

- `overview`, `reports`, `users`, `members`, `journal`, `help-posts`, `animal-posts`, `animal-alerts` : chacune doit **vérifier le membership** et refuser les accès non autorisés.

---

## Ce qu’elle ne doit pas faire

- Ne pas servir de **landing publique** (sites vitrine à part).
- Ne pas remplacer l’**app citoyenne** pour les parcours habitants.
- L’**URL canonique** pour le rôle mairie en production peut être **`vivreici-collectivites`** pour séparer clairement marketing / ops / mairie (voir [`vivreici-collectivites.md`](./vivreici-collectivites.md)).

---

## Technique (rappels)

- Next.js, Supabase (SSR + client), Leaflet pour les vues carte dans les écrans reports.
- **`app/admin/layout.tsx`** : exige une session valide ; redirection vers `/connexion` si absent.

Variable documentée : `NEXT_PUBLIC_COLLECTIVITES_APP_URL` (documentation / liens futurs vers l’app mairie). Voir `vivreici-admin/.env.example`.

---

## Fichiers clés à connaître

- `lib/admin-access.ts`, `lib/admin-types.ts` : membership et capacités.
- `components/admin/AdminSidebar.tsx` : navigation selon rôle.
- `app/api/admin/*` : contrats JSON des écrans.
