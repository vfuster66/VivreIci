# Audit `vivreici-app`

Document de suivi vivant pour piloter l'audit produit, UX, UI, accessibilité, performance, sécurité, RGPD et qualité technique de l'application citoyenne `vivreici-app`.

## Métadonnées

- Produit: `vivreici-app`
- Périmètre: application web publique mobile / PWA citoyenne
- Dernière mise à jour: `2026-04-03`
- Références inspectées:
  - `app/page.tsx`
  - `components/AppShell.tsx`
  - `components/BottomNav.tsx`
  - `app/signalements/nouveau/page.tsx`
  - `app/signalements/page.tsx`
  - `app/connexion/page.tsx`
  - `app/inscription/page.tsx`
  - `app/profil/page.tsx`
  - `app/entraide/page.tsx`
  - `app/animaux/page.tsx`
  - `app/confidentialite/page.tsx`
  - `components/FeedbackBanner.tsx`
  - `lib/offline-report-queue.ts`

## Échelle de priorité

- `High`: fort impact produit, confiance, sécurité ou usage clé
- `Medium`: impact réel mais non bloquant
- `Low`: optimisation, polish ou amélioration secondaire

## Synthèse exécutive

`vivreici-app` est déjà plus mature qu’un simple MVP. Le produit a une vraie proposition de valeur hyper-locale, une structure mobile cohérente, une base PWA/offline rare et utile, et plusieurs parcours riches autour du signalement, de l’entraide et des animaux. Le niveau de sérieux perçu est bon.

Le principal risque n’est pas l’absence de fonctionnalités. Il est ailleurs: la densité et la complexité des parcours critiques, surtout le signalement. L’application semble vouloir tout bien faire dès le premier usage: géolocalisation, média, détection de doublons, file offline, auth, suivi, préférences. C’est puissant, mais potentiellement coûteux cognitivement pour un usager mobile pressé.

La home publique, elle, va plutôt dans le bon sens: elle est sobre, rapide à comprendre et adaptée à un usage mobile. Le bon choix n’est probablement pas de la charger davantage, mais de préserver cette sobriété tout en optimisant très légèrement l’orientation vers l’action si nécessaire.

L’autre angle sensible est la conformité opérationnelle. Il y a déjà une page de confidentialité, des préférences utilisateur et des garde-fous sur certains formulaires, ce qui est bon signe. En revanche, l’audit montre encore des zones à formaliser proprement: consentement analytics, gouvernance des données, sécurité session/auth et validation mesurée via outils d’accessibilité/performance. Une partie des contenus légaux sera portée à terme par un site statique dédié, qui devra ensuite être relié depuis l’application.

## Erreurs critiques business

- `High` Le parcours `nouveau signalement` est le cœur du produit et concentre beaucoup de logique. S’il est perçu comme trop long ou trop chargé, le produit perd sa promesse principale.
- `Medium` Le risque sur la home n’est pas un manque de contenu, mais un éventuel manque d’orientation fine. La priorité est de préserver sa légèreté, pas de la densifier.
- `Medium` La valeur de l’offline existe techniquement, mais doit être explicitée et rendue rassurante dans l’expérience utilisateur, sinon elle reste invisible.
- `Medium` La conformité RGPD n’est pas absente, mais encore trop dépendante d’hypothèses implicites plutôt que d’un cadre explicitement lisible.

## Maturité produit estimée

- Niveau de maturité: `3.5/5`

Lecture:
- Le produit n’est plus au stade exploration.
- Le socle d’expérience et de fonctionnalités est déjà avancé.
- La prochaine marche n’est pas “ajouter beaucoup de features”, mais fiabiliser, simplifier, mesurer et rendre plus lisible.

## 1. Product & Business Logic

### Constats

- `High` Proposition de valeur globalement claire:
  - Signaler
  - Être alerté
  - S’entraider
  - Suivre ce qui se passe localement
- `High` Compréhension en moins de 5 secondes:
  - La home explique le produit correctement.
  - Elle est volontairement légère, ce qui est cohérent avec un usage mobile.
  - Les ajustements à envisager doivent rester marginaux.
- `High` Bon alignement fonctionnalités / besoins:
  - signalement citoyen
  - suivi local
  - entraide
  - animaux
  - notifications
  - profil / préférences
- `Medium` Les parcours clés existent, mais leur hiérarchie produit n’est pas encore parfaitement lisible.
- `Medium` L’application semble conçue comme un produit riche, pas comme un flux ultra-minimal. C’est une force si l’orchestration est claire, une faiblesse si tout arrive trop tôt.

### Frictions business

- `High` Risque de décrochage sur le premier signalement si la friction perçue est trop forte.
- `Medium` Le produit a plusieurs promesses simultanées, ce qui peut diluer le message principal selon le contexte utilisateur.
- `Medium` Les boucles de rétention ne sont pas encore visibles comme telles dans l’interface.

### Opportunités

- `Medium` Préserver la home comme point d’entrée léger, avec micro-ajustements seulement si un besoin clair apparaît.
- `High` Définir clairement le “parcours roi”: premier signalement réussi.
- `Medium` Rendre les bénéfices de l’offline et du suivi plus visibles.
- `Medium` Introduire une logique de guidance contextuelle selon le point d’entrée.

## 2. UX

### Constats

- `High` Le shell mobile est déjà cohérent:
  - topbar
  - bottom nav
  - safe area
  - layout centré mobile
- `High` Le flux `nouveau signalement` paraît riche et robuste:
  - géolocalisation
  - recherche d’adresse
  - dictée
  - médias
  - doublons
  - offline queue
  - reprise réseau
- `High` Cette richesse crée aussi le principal risque UX: surcharge cognitive.
- `Medium` Les feedbacks semblent présents sur plusieurs parcours, avec un pattern dédié (`FeedbackBanner`).
- `Medium` Les états `loading/error/empty` semblent anticipés, mais doivent être audités écran par écran.
- `Medium` La navigation mobile est saine en apparence, mais la cohérence entre onglets, retour et vues profondes doit être confirmée.

### Frictions UX majeures

- `High` Trop d’options possibles dans le parcours de signalement pour un contexte d’urgence ou de mobilité.
- `Low` La home peut éventuellement gagner en orientation fine, mais il ne faut pas la surcharger.
- `Medium` Les vues riches comme `entraide`, `animaux`, `profil` peuvent devenir denses si la hiérarchie n’est pas très claire.
- `Medium` Le compte anonyme puis l’inscription/finalisation peuvent être puissants, mais doivent être ultra-lisibles pour éviter la confusion.

### Recommandations priorisées

- `High` Réduire le coût cognitif du premier signalement:
  - progressive disclosure
  - priorisation plus nette des champs indispensables
  - état avancé mieux séparé du flux principal
- `High` Auditer les micro-frictions du parcours auth / inscription / retour.
- `Medium` Mieux expliciter l’état de synchro offline et la file locale.
- `Medium` Uniformiser les patterns de feedback utilisateur sur tous les parcours publics.

## 3. UI

### Constats

- `Medium` Direction visuelle propre, simple, mobile-first.
- `Medium` Palette cohérente et suffisamment identifiable.
- `Medium` La UI semble déjà disciplinée sur le spacing et les composants de base.
- `Medium` Certaines zones risquent la densité excessive sur les écrans fonctionnellement riches.
- `Low` Le style global est rassurant, et la sobriété de la home est plutôt une qualité dans ce contexte mobile.

### Hiérarchie visuelle

- `Medium` Bonne base, mais les écrans complexes doivent encore être validés dans leur hiérarchie réelle.
- `Medium` Les CTA critiques semblent présents, mais il faut vérifier qu’ils dominent bien les écrans les plus chargés.
- `Medium` Certaines vues peuvent nécessiter un meilleur découpage entre lecture, action et détail.

### Recommandations UI

- `High` Revoir la hiérarchie visuelle du parcours `signalement`.
- `Low` Conserver la sobriété de la home; n’ajuster que les micro-signaux de direction si besoin.
- `Medium` Vérifier la lisibilité des écrans accordéon / panneaux dans `profil`.
- `Medium` Confirmer la cohérence iOS / Android sur les zones tactiles, barres basses et formulaires.

## 4. Accessibilité (WCAG)

### Constats

- `Medium` Présence de labels explicites sur auth et inscription.
- `Medium` `FeedbackBanner` montre un bon pattern avec `role` et `aria-live`.
- `Medium` La conformité globale ne peut pas être considérée acquise sans audit outillé.
- `Medium` Les parcours complexes et les dialogues custom doivent être validés formellement.
- `Medium` Les contrastes semblent corrects à première vue, mais pas encore vérifiés systématiquement.

### Risques d’accessibilité

- `High` Composants riches du parcours signalement.
- `High` Dialogues / overlays dans `entraide` et `animaux`.
- `Medium` Taille et clarté des zones tactiles dans certains éléments denses.
- `Medium` Validation d’erreur et ordre de lecture screen reader sur les écrans les plus longs.

### Score accessibilité estimé

- `3/5`

### Recommandations

- `High` Lancer `axe` / Lighthouse sur les écrans clés.
- `High` Vérifier les dialogues, focus trap et retour focus sur les modales publiques.
- `Medium` Vérifier les contrastes AA sur la palette réelle.
- `Medium` Valider l’ergonomie screen reader sur `signalement`, `profil`, `entraide`, `animaux`.

## 5. Performance & Frontend

### Constats

- `High` La présence d’un service worker, d’un manifest et d’une file offline est un très bon signal.
- `High` L’offline report queue est un différenciateur technique fort.
- `Medium` La performance perçue reste à mesurer sur mobile réel.
- `Medium` Les vues carte et les écrans riches peuvent peser plus qu’une vue formulaire simple.
- `Medium` Le produit montre une bonne direction résilience réseau, mais il faut valider le coût UX et technique.

### Recommandations

- `High` Mesurer Lighthouse / Web Vitals sur:
  - home
  - signalements
  - nouveau signalement
  - entraide
  - animaux
- `High` Auditer le parcours offline de bout en bout.
- `Medium` Vérifier le coût de chargement des cartes et médias.
- `Medium` Vérifier l’impact bundle des dépendances cartographiques et UI.

## 6. Mobile Specific UX

### Constats

- `High` Le produit est clairement pensé mobile.
- `High` Safe area gérée dans le shell et la bottom nav.
- `Medium` Les CTA critiques doivent être évalués dans les vues les plus denses.
- `Medium` Le clavier mobile et les scrolls longs sont des zones à tester en profondeur.
- `Medium` L’expérience tactile semble bien engagée, mais les flows complexes doivent être validés sur device.

### Recommandations

- `High` Tester le parcours `nouveau signalement` sur petit écran réel.
- `High` Vérifier la bottom nav dans tous les états de route.
- `Medium` Valider l’ergonomie pouce sur CTA primaires et secondaires.
- `Medium` Auditer la gestion du clavier dans formulaires longs.

## 7. Sécurité Web (OWASP)

### Constats

- `Medium` Les flows auth publics existent et semblent relativement sobres.
- `Medium` L’audit sécurité détaillé n’a pas encore été fait.
- `Medium` Les endpoints publics liés aux contributions, notifications et uploads doivent être revus en priorité.
- `Medium` L’inscription collecte déjà des consentements et préférences, donc le sérieux attendu est plus élevé.

### Risques potentiels

- `High` Session/auth publique à auditer.
- `High` Validation input côté serveur sur les contenus publics à confirmer.
- `Medium` Gestion des erreurs à vérifier sur l’ensemble des routes publiques.
- `Medium` Audit XSS/CSRF/stockage token à faire explicitement.

### Score sécurité estimé

- `3/5`

### Recommandations

- `High` Auditer les flows `connexion`, `inscription`, reset et session.
- `High` Auditer les routes publiques:
  - signalements
  - entraide
  - animaux
  - alerts
  - notifications
- `Medium` Formaliser une check-list OWASP app publique.

## 8. RGPD & Conformité

### Constats

- `Medium` Une page de confidentialité existe déjà dans l’app.
- `Medium` L’inscription demande explicitement l’acceptation de la politique de confidentialité.
- `Medium` Des préférences de consentement et de suivi existent.
- `High` Il manque encore un audit complet du statut analytics / consentement / base légale / durée.
- `Low` Une partie des contenus légaux complets sera portée par un futur site statique, avec liens à ajouter dans l’app.
- `Medium` Les droits utilisateur semblent partiellement couverts via le profil, mais doivent être vérifiés formellement.

### Risques RGPD

- `High` Tracking analytics sans cadre encore explicitement audité.
- `Medium` Contact RGPD / DPO pas clairement visible dans les extraits inspectés.
- `Medium` Durées de conservation et gouvernance encore à formaliser.

### Score RGPD estimé

- `2.5/5`

### Recommandations

- `High` Auditer la page confidentialité existante, le tracking et les manques de gouvernance.
- `High` Vérifier le besoin réel d’une bannière / CMP selon le tracking mis en place.
- `Medium` Clarifier les droits d’accès, suppression et rectification.
- `Medium` Prévoir le raccord au futur site statique pour les contenus légaux complets.

## 9. Architecture & Qualité technique

### Constats

- `Medium` Repo lisible et structuré.
- `Medium` Briques métier identifiables dans `lib/`.
- `Medium` Shell global bien isolé.
- `Medium` Le code semble déjà dépasser le stade prototype désordonné.
- `Medium` Les écrans très riches doivent encore être évalués pour leur maintenabilité fine.

### Recommandations

- `Medium` Cartographier les primitives de shell et les composants cross-feature.
- `Medium` Identifier les zones de dette sur les écrans riches.
- `Medium` Vérifier si certains composants métier doivent être davantage découpés.

## 10. SEO (webapp publique)

### Constats

- `Medium` Le produit est public, donc le SEO peut compter au moins sur la home et certaines pages d’information.
- `Medium` `metadata` minimale présente dans le layout.
- `Medium` Le potentiel SEO réel dépendra du contenu indexable et de la stratégie de pages publiques.

### Recommandations

- `Medium` Auditer les meta pages publiques stratégiques.
- `Medium` Vérifier le niveau de contenu indexable utile.
- `Low` Vérifier structure HTML et performance SEO mobile.

## 11. Quick Wins

- `High` Simplifier visuellement le parcours `nouveau signalement`.
- `High` Mesurer accessibilité/performance avec outils plutôt que rester en inspection statique.
- `Medium` Rendre l’offline plus explicite côté UX.
- `Medium` Clarifier davantage le cadre confidentialité / consentement / contact.

## 12. Recommandations stratégiques

### Top 5 priorités

1. Sécuriser et simplifier le parcours `nouveau signalement`.
2. Valider que la home reste légère et efficace sans la densifier.
3. Valider formellement accessibilité et performance mobile.
4. Auditer auth / session / endpoints publics.
5. Consolider le cadre RGPD et tracking.

### Plan d’action

#### Court terme

- Audit détaillé de `nouveau signalement`
- audit `axe` / Lighthouse
- audit auth / session / endpoints publics
- audit RGPD de la page confidentialité et du tracking

#### Moyen terme

- refonte UX ciblée du premier signalement
- clarification des feedbacks offline / sync
- renforcement des patterns UI et composants mobiles riches

#### Long terme

- cockpit de rétention et de contribution citoyenne
- observabilité produit et technique
- industrialisation des audits qualité / accessibilité / sécurité / conformité

## 13. Scoring global

- Produit: `3.5/5`
- UX: `3.5/5`
- UI: `3.5/5`
- Accessibilité: `3/5`
- Performance: `3.5/5`
- Sécurité: `3/5`
- RGPD: `2.5/5`

## Backlog priorisé

| ID | Domaine | Priorité | Sujet | Constat | Action recommandée | Statut |
|---|---|---|---|---|---|---|
| A-001 | Produit | Low | Home publique | La home est volontairement légère et cohérente pour le mobile. | Préserver cette sobriété et ne faire que des micro-ajustements si un besoin réel apparaît. | À valider |
| A-002 | UX | High | Parcours signalement | Le flux est puissant mais probablement trop dense. | Auditer et simplifier `nouveau signalement`. | Fait |
| A-003 | UX mobile | Medium | Navigation principale | Shell sain, cohérence globale à confirmer. | Auditer bottom nav, retours et vues profondes. | Fait |
| A-004 | Performance / résilience | High | Offline / PWA | Gros point fort technique, à valider côté UX réelle. | Auditer le parcours offline de bout en bout. | Fait |
| A-005 | Accessibilité | High | Audit outillé | L’inspection statique ne suffit pas. | Lancer `axe` / Lighthouse et corriger les écarts. | En cours |
| A-006 | RGPD | High | Cadre légal | Base existante dans l’app, avec futur relais partiel vers un site statique. | Auditer confidentialité, tracking, droits et conservation, puis raccorder les liens légaux au site statique. | En cours |
| A-007 | Sécurité | High | Auth / session / endpoints | Zones sensibles non encore auditées. | Auditer auth, session, validation et exposition d’erreurs. | À faire |
| A-008 | Architecture | Medium | Shell / primitives | Bonne base, à cartographier plus formellement. | Documenter le shell et les conventions de composants. | À faire |
| A-009 | UI | Medium | Hiérarchie mobile | Écrans riches à confirmer visuellement. | Auditer lisibilité, densité et hiérarchie des vues cœur. | À faire |

## Journal de suivi

| Date | Auteur | Mise à jour |
|---|---|---|
| 2026-04-03 | Codex | Création du document initial d’audit de `vivreici-app`. |
| 2026-04-03 | Codex | Réécriture en audit complet structuré selon le cadrage produit / UX / UI / accessibilité / sécurité / RGPD / architecture demandé. |
| 2026-04-03 | Codex | Ajustement de l’audit selon les arbitrages produit: home à préserver légère, conformité légale partiellement portée à terme par un site statique, audit recentré sur les parcours critiques plutôt que sur une densification de l’écran d’accueil. |
| 2026-04-03 | Codex | Premier lot implémenté sur `nouveau signalement`: lecture par étapes, statut d’avancement, hiérarchie plus claire entre essentiel et options avancées. |
| 2026-04-03 | Codex | Deuxième lot sur `nouveau signalement`: alerte de doublon rendue plus lisible, zone d’envoi transformée en vraie étape de validation avec état de préparation. |
| 2026-04-03 | Codex | Troisième lot sur `nouveau signalement`: section avancée rendue plus informative même repliée, statuts offline séparés plus proprement des erreurs d’envoi. |
| 2026-04-03 | Codex | Clôture de `A-002`: la liste de doublons n’affiche plus tout d’un coup, ce qui réduit la surcharge du parcours de soumission. |
| 2026-04-03 | Codex | Début de `A-003`: la bottom nav est désormais masquée sur les écrans profonds et les écrans de flux/auth, avec ajustement du padding bas du shell. |
| 2026-04-03 | Codex | Suite de `A-003`: les liens vers le détail des signalements conservent maintenant le contexte d’origine (`liste`, `carte`, `profil`, `création`) pour rendre le retour plus cohérent. |
| 2026-04-03 | Codex | Début de `A-004`: ajout d’un indicateur global de synchronisation hors ligne dans la topbar pour rendre la file locale visible au-delà du seul formulaire de création. |
| 2026-04-03 | Codex | Suite de `A-004`: ajout d’un feedback global temporaire lors des reprises automatiques, succès et échecs de synchronisation hors ligne. |
| 2026-04-03 | Codex | Début de `A-005`: amélioration des relations ARIA sur la topbar (toolbar, controls, expanded) et nommage explicite de la navigation principale. |
| 2026-04-03 | Codex | Optimisation ciblée de la vue `/signalements?view=map` après lecture Lighthouse: ajout d’un shell HTML de chargement pour éviter qu’une tuile Leaflet serve de LCP, et démarrage du temps réel après le premier chargement initial. |
| 2026-04-03 | Codex | Allègement de la requête Supabase de la vue carte avec une projection dédiée `map`, pour éviter de charger des champs inutiles au premier rendu. |
| 2026-04-03 | Codex | Suite de `A-005`: correction des deux écarts Lighthouse actionnables sur `/signalements?view=map`, avec nom accessible injecté sur chaque marqueur Leaflet et contraste renforcé pour l’onglet actif de la bottom nav. |
| 2026-04-03 | Codex | Ajout d’un panneau de résumé au-dessus de la carte au premier affichage, masqué à la première interaction, pour améliorer le contenu utile initial et limiter la domination visuelle du fond cartographique au chargement. |

## Historique

Déplacer ici les éléments soldés ou obsolètes en conservant la date et la raison du déplacement.
