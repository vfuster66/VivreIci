# Site `vivreici-site-collectivites`

## Rôle dans l’écosystème

C’est la **landing marketing B2B** pour les **collectivités** : expliquer le problème (dispersion des signalements, manque de visibilité), la solution VivreIci, le fonctionnement, les bénéfices, les **offres / tarifs**, la crédibilité, la **FAQ**, et pousser vers une **démo** (mailto) ou l’**accès à l’app espace collectivité** (mairie).

**Public cible :** décideurs et agents en mairie / intercommunalité / métropole.

**Port de développement habituel :** `3003`.

---

## Ce qu’il doit faire

### Parcours de contenu (landing)

Ordre type de la page d’accueil (`CollectivitesLanding`) :

1. **Navbar** : ancres (solution, fonctionnement, tarifs, FAQ), CTA démo (mailto).
2. **Hero** : promesse, CTA démo + découverte + **lien vers l’app collectivités** (URL configurée).
3. **Problème** : pains métier (visibilité, dispersion, suivi, historique).
4. **Solution** : centralisation, carte, suivi dans le temps.
5. **Fonctionnement** : étapes citoyen → centralisation → visualisation collectivité → traitement.
6. **Produit** : fonctionnalités type carte, liste, filtres, statuts, historique + visuel (ex. `map.png`, mockup).
7. **Bénéfices** : gain de temps, priorisation, suivi clair.
8. **Tarifs** : grilles Observation / Gestion / Pilotage avec CTA vers bloc final ou mailto.
9. **Crédibilité** : rassurances (local, simplicité, toutes tailles).
10. **FAQ** : questions récurrentes (gratuité, petites communes, RGPD, canal signalements).
11. **CTA final** : démo + contact (mailto).
12. **Footer** : marque VivreIci, liens légaux (via `NEXT_PUBLIC_MARKETING_SITE_URL` si défini), contact mailto.

### Charte éditoriale et visuelle

- **Marque** : « Vivre » en bleu, « Ici » en jaune lorsque le nom est écrit en texte (`VivreIciMark`).
- **Fond** hero / CTA : dégradé bleu léger, textes lisibles (couleurs dédiées).
- Ton **pro** et **terrain**, pas technique inutile.

### Intégrations configurables

- **`NEXT_PUBLIC_COLLECTIVITES_APP_URL`** : base de l’**app mairie** (`vivreici-collectivites`, ex. `http://localhost:3004`). Les boutons « Accéder à la plateforme » doivent pointer dessus. Secours : `NEXT_PUBLIC_ADMIN_APP_URL`.
- **`NEXT_PUBLIC_CONTACT_EMAIL`** : destinataire des mailto démo / contact.
- **`NEXT_PUBLIC_MARKETING_SITE_URL`** : site vitrine pour liens mentions / confidentialité / CGU si hébergés ailleurs.

Voir `lib/collectivites-links.ts` et `.env.example`.

---

## Ce qu’il ne doit pas faire

- **Pas** de tableau de bord métier ni connexion Supabase pour traiter des signalements : tout le **travail opérationnel** est dans **`vivreici-collectivites`** (et la modération globale dans **`vivreici-admin`**).
- **Pas** de duplication de l’**app citoyenne** : les habitants ne sont pas la cible principale de cette URL.

---

## Technique (rappels)

- Next.js, sections en React (partie client pour FAQ / menu mobile).
- Assets statiques sous `public/collectivites/` (logos, `map.png`, etc.).

---

## Fichiers clés

- `app/page.tsx` → `components/collectivites-landing/*`
- `lib/collectivites-links.ts`
- `app/globals.css` (thème, utilitaires landing)
