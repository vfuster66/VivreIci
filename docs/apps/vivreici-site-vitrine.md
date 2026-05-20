# Site `vivreici-site-vitrine`

## Rôle dans l’écosystème

C’est le **site marketing et institutionnel grand public** : présenter VivreIci aux habitants et partenaires, renvoyer vers l’**app citoyenne** ou les stores, et héberger les **pages légales** (mentions, confidentialité, CGU, cookies) réutilisables par les autres apps via URL absolues.

**Public cible :** grand public, presse, partenaires.

**Port de développement habituel :** `3002`.

---

## Ce qu’il doit faire

### Page d’accueil

- **Landing** : message de valeur, fonctionnalités, appels à l’action vers l’application citoyenne (ou téléchargement) selon le composant `LandingHome` et les liens configurés.

### Pages légales et confiance

- **Mentions légales**
- **Politique de confidentialité**
- **Conditions générales d’utilisation**
- **Politique cookies**

Ces URLs sont typiquement référencées par **`NEXT_PUBLIC_MARKETING_SITE_URL`** dans les autres projets pour footer / liens « légal ».

### SEO et conformité

- Métadonnées (title, description) adaptées au site vitrine.
- Contenu **stable** et **à jour** avec la réalité du produit et la politique de données.

---

## Ce qu’il ne doit pas faire

- **Pas** d’auth Supabase « applicative » pour le cœur du produit (pas de tableau de bord métier ici).
- **Pas** de remplacement de l’**app citoyenne** : pas de signalement réel depuis ce site sauf **lien profond** vers `vivreici-citoyen`.
- La **landing B2B collectivités** est sur **`vivreici-site-collectivites`**, pas sur la vitrine (sauf lien croisé volontaire).

---

## Technique (rappels)

- Next.js, contenu statique / SSR léger.
- Variables typiques : URL de l’app citoyenne, URL du site collectivités, analytics si ajoutés.

Voir `vivreici-site-vitrine/lib/site-links.ts` et `.env.example` pour les liens entre sites.

---

## Fichiers clés

- `app/page.tsx` → `components/landing/landing-home.tsx`
- `app/mentions-legales`, `politique-de-confidentialite`, `conditions-generales-d-utilisation`, `politique-cookies`
