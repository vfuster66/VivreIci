# Audit `vivreici-admin`

Document de suivi vivant pour piloter l'audit produit, UX, accessibilité, sécurité, RGPD et qualité frontend du backoffice desktop `vivreici-admin`.

## Mode d'emploi

- Mettre à jour la date de revue à chaque session d'audit.
- Conserver les constats structurants.
- Faire évoluer le statut des actions au fil des correctifs.
- Ajouter un lien vers les PR, tickets ou commits quand une action avance.
- Ne pas supprimer l'historique: déplacer les points soldés dans la section `Historique`.

## Métadonnées

- Produit: `vivreici-admin`
- Périmètre: backoffice web desktop
- Dernière mise à jour: `2026-04-03`
- Responsable produit:
- Responsable technique:
- Référent accessibilité:
- Référent sécurité / RGPD:

## Échelle de priorité

- `P0`: critique, bloque la fiabilité, la sécurité ou un usage métier important
- `P1`: important, fort impact usage / dette / risque
- `P2`: amélioration utile, impact moyen
- `P3`: confort, polish, optimisation secondaire

## Échelle de statut

- `À faire`
- `En cours`
- `Bloqué`
- `À valider`
- `Fait`

## Synthèse actuelle

### Forces

- Proposition de valeur globalement claire pour un backoffice.
- Segmentation par rôles cohérente: `superadmin`, `admin`, `mairie`.
- Interface visuellement homogène et déjà exploitable.
- Base technique lisible et désormais plus robuste grâce à un socle partagé de composants et builders serveur.

### Faiblesses structurantes

- La fiabilité des données a été largement traitée sur les comptes, les KPI et la liste détaillée des signalements.
- L’expérience est désormais plus orientée pilotage, mais reste encore peu instrumentée en SLA, alertes et observabilité.
- L’accessibilité structurelle a nettement progressé sur les modales, le focus et les feedbacks, sans audit outillé final.
- Les principaux écarts restants concernent désormais surtout la sécurité de session, la conformité RGPD et la mesure formelle qualité/performance.

## Scoring de référence

- Produit: `4/5`
- UX: `4/5`
- UI: `4/5`
- Accessibilité: `3.5/5`
- Performance: `3.5/5`
- Sécurité: `3/5`
- RGPD: `1.5/5`
- Maturité globale estimée: `4/5`

## Erreurs critiques business

- `P1` Le backoffice aide désormais à prioriser, mais ne dispose pas encore d’une logique explicite de SLA, de retard et d’alerting métier.
- `P1` La sécurité de session admin reste à durcir à moyen terme.
- `P1` La conformité RGPD dépend désormais d’un site statique externe encore non livré.

## Backlog d'audit priorisé

| ID | Domaine | Priorité | Sujet | Constat | Action recommandée | Statut | Owner | Référence |
|---|---|---|---|---|---|---|---|---|
| A-001 | Data / Produit | P0 | Fiabilité des listes | Les limites hardcodées peuvent masquer des utilisateurs ou signalements. | Remplacer les `limit` fixes par pagination serveur + total fiable. | Fait |  | `users`, `members` et `reports` fiabilisés |
| A-002 | Data / Produit | P0 | Fiabilité des KPI mairie | Les compteurs mairie semblent parfois calculés sur un sous-ensemble. | Recalculer les métriques sur requêtes de comptage dédiées. | Fait |  | `overview` recalculé avec compteurs dédiés |
| A-003 | Sécurité | P0 | Création de comptes | Le mot de passe initial est saisi par un admin dans le backoffice. | Passer à un flow d'invitation ou reset forcé à la première connexion. | Fait |  | création via email de définition de mot de passe |
| A-004 | Sécurité | P1 | Exposition des erreurs | Les erreurs backend peuvent remonter trop directement au frontend. | Normaliser des messages métier et journaliser les détails côté serveur uniquement. | Fait |  | routes admin normalisées avec messages métier côté frontend |
| A-005 | UX | P1 | États de chargement | Nombreux loaders plein écran, peu informatifs. | Introduire skeletons, rendu progressif et continuité d'écran. | Fait |  | squelette réutilisable déployé sur les vues admin, avec états vides actionnables |
| A-006 | UX | P1 | Actions sensibles | Les confirmations actuelles sont faibles (`window.confirm`). | Remplacer par des dialogues riches avec impact, contexte et confirmation explicite. | Fait |  | `AdminConfirmDialog` intégré sur comptes et accès |
| A-007 | Accessibilité | P1 | Modales accessibles | Dialogues probablement incomplets pour clavier et lecteur d'écran. | Ajouter `role="dialog"`, `aria-modal`, focus trap, retour focus et fermeture clavier. | Fait |  | `AdminModalShell` et `AdminConfirmDialog` couvrent les modales admin avec focus trap et retour focus |
| A-008 | Accessibilité | P1 | Feedback accessible | Les messages d'erreur/succès ne semblent pas annoncés. | Ajouter des zones `aria-live` et lier les erreurs aux champs. | Fait |  | formulaires auth et admin couverts par `aria-live`, erreurs de formulaire séparées des erreurs de chargement |
| A-009 | Produit | P1 | Pilotage par rôle | Les écrans restent assez génériques et descriptifs. | Construire des vues orientées décision par rôle avec priorisation métier. | Fait |  | l’ensemble des vues admin clés expose désormais des priorités, files d’action ou points chauds exploitables |
| A-010 | Performance | P1 | Data fetching | Beaucoup de pages chargent les données entièrement côté client. | Déplacer les chargements initiaux critiques côté serveur ou hybride. | Fait |  | `overview`, `users`, `access`, `reports`, `entraide`, `journal`, `animaux-annonces` et `animaux-alertes` passent sur un premier rendu serveur |
| A-011 | Architecture | P2 | Duplication UI | Les patterns modale, formulaire, feedback et chargement sont répétés. | Extraire des primitives admin partagées. | Fait |  | `AdminSelectableCard`, `AdminInsetPanel` et `AdminMiniStat` complètent désormais le socle de primitives admin partagées |
| A-012 | UI | P2 | Hiérarchie visuelle | Beaucoup de cartes ont le même poids visuel. | Renforcer la hiérarchie entre résumé, alertes, listes et actions. | Fait |  | hiérarchie KPI, priorités, panneaux, cartes de liste et en-têtes de colonnes clarifiée sur les vues principales et secondaires |
| A-013 | RGPD | P1 | Documentation légale | Pas de trace visible de politique, gouvernance ou rétention. | Pointer le backoffice vers les pages légales hébergées sur le futur site statique et formaliser le contenu hors backoffice. | Bloqué |  | dépendance produit externe: site statique pour politique de confidentialité / mentions / contact RGPD |
| A-014 | SEO / Hardening | P3 | Indexation | Le backoffice devrait être explicitement non indexé. | Ajouter `noindex, nofollow` et protections associées. | Fait |  | `metadata.robots` positionné sur `index: false, follow: false` |

## Détail par domaine

### 1. Produit & logique métier

#### Constats

- La promesse est claire: backoffice distinct de l'app citoyenne.
- La séparation des rôles est saine.
- Les vues clés sont désormais davantage orientées exploitation quotidienne que simple consultation.
- La priorisation métier existe maintenant sur les principaux écrans, même si elle peut encore être enrichie par des SLA et alertes plus explicites.

#### Actions de suivi

- [x] Transformer les tableaux de bord descriptifs en tableaux de bord de pilotage.
- [ ] Formaliser dans la documentation produit les objectifs par rôle `superadmin`, `admin`, `mairie`.
- [ ] Formaliser les 5 décisions métier les plus fréquentes prises dans le backoffice.

### 2. UX

#### Constats

- Les parcours sont plutôt courts.
- Les actions sensibles manquent de cadre UX robuste.
- Les états vides et d'erreur restent fonctionnels mais peu accompagnants.

#### Actions ouvertes

- [x] Ajouter des états vides actionnables.
- [x] Ajouter des confirmations riches pour suppression, reset, révocation, rétrogradation.
- [x] Réduire les rechargements complets après action sur `animal-posts` et `animal-alerts`.

### 3. UI

#### Constats

- La cohérence visuelle est bonne.
- Un socle de composants admin partagés existe désormais, même s’il n’est pas encore documenté comme design system complet.
- Certaines vues gagneraient à utiliser de vraies tables desktop plutôt que seulement des cartes.

#### Actions de suivi

- [x] Définir un kit de composants admin partagé.
- [x] Standardiser badges, filtres, boutons, panneaux et dialogues.
- [x] Revoir la hiérarchie visuelle des dashboards.
- [ ] Décider si certaines listes desktop doivent évoluer de cartes vers de vraies tables structurées.

### 4. Accessibilité

#### Constats

- Labels présents sur une grande partie des formulaires.
- Les modales, le focus visible et les feedbacks annoncés sont maintenant traités sur le backoffice.
- Les contrastes les plus fragiles ont été renforcés, mais restent à vérifier formellement.

#### Actions de suivi

- [ ] Lancer un audit `axe` / Lighthouse accessibilité.
- [x] Corriger toutes les modales.
- [x] Ajouter `aria-live` sur erreurs et succès dans tous les formulaires restants.
- [x] Séparer les erreurs de chargement des erreurs de formulaire sur les vues animaux.
- [ ] Vérifier tous les contrastes critiques en WCAG AA.

### 5. Performance & frontend

#### Constats

- Le chargement initial des vues critiques n’est plus principalement client-side.
- Les listes volumineuses ne sont pas préparées pour grossir.
- La carte peut peser inutilement sur certaines vues.

#### Actions de suivi

- [x] Prioriser SSR / rendu hybride pour overview et listes critiques.
- [x] Ajouter pagination serveur.
- [ ] Mesurer les vues principales avec Lighthouse et Web Vitals.
- [ ] Évaluer virtualisation sur les listes les plus longues.

### 6. Sécurité

#### Constats

- Le contrôle d'accès par rôle existe.
- Le flow de création de comptes est maintenant plus sain côté UX/process.
- La remontée d'erreurs techniques côté frontend a été durcie.

#### Actions de suivi

- [x] Remplacer la création par mot de passe initial par invitation.
- [x] Standardiser les erreurs API exposées.
- [ ] Revoir la stratégie de session admin à moyen terme.
- [ ] Formaliser une check-list OWASP pour le backoffice.

### 7. RGPD & conformité

#### Constats

- Le cadre de conformité n'est pas visible dans le produit.
- Les analytics et données utilisateurs nécessitent une gouvernance documentée.
- Les pages légales seront portées par un site statique séparé, pas directement par ce backoffice.

#### Actions de suivi

- [ ] Prévoir un lien explicite depuis le backoffice vers les pages légales du site statique une fois celui-ci disponible.
- [ ] Documenter finalités, base légale et durée de conservation sur le site statique.
- [ ] Ajouter un contact RGPD / DPO si applicable sur le site statique.
- [ ] Cartographier les données personnelles manipulées par le backoffice.
- [ ] Définir les procédures d'accès, suppression et rectification.

### 8. Architecture & qualité technique

#### Constats

- Le code est globalement propre.
- Les principaux patterns UI et d’état sont désormais largement mutualisés.
- Le principal risque n'est pas la lisibilité actuelle, mais l'échelle future.

#### Actions de suivi

- [x] Extraire les primitives de page admin.
- [x] Mutualiser les patterns `load/error/empty` avec composants réutilisables pour skeletons, modales et états vides.
- [ ] Documenter les conventions de fetch et de composition des pages.

## Plan d'action recommandé

### Court terme

- Lancer un audit outillé `axe` / Lighthouse et fermer les derniers écarts mesurés.
- Mesurer les vues critiques avec Lighthouse / Web Vitals.
- Décider si certaines listes doivent passer de cartes à tables desktop structurées.
- Préparer le lien du backoffice vers le futur site statique légal.

### Moyen terme

- Documenter les objectifs par rôle et les décisions métier clés.
- Revoir la stratégie de session admin à moyen terme.
- Documenter les conventions de fetch, de composition de page et le socle de composants admin.
- Formaliser la conformité RGPD minimale sur le site statique.

### Long terme

- Construire un cockpit métier par rôle avec SLA, retards, alertes et observabilité.
- Mettre en place une observabilité produit et technique.
- Industrialiser les revues accessibilité, sécurité et conformité.

## Journal de suivi

| Date | Auteur | Mise à jour | Liens |
|---|---|---|---|
| 2026-04-02 | Codex | Création du document initial d'audit pour `vivreici-admin`. |  |
| 2026-04-02 | Codex | Flow de création de comptes durci, `noindex` ajouté, feedbacks accessibles initiaux, récupération exhaustive des utilisateurs/admins, KPI overview fiabilisés, dialogues de confirmation et coque modale réutilisable ajoutés. |  |
| 2026-04-02 | Codex | Pagination serveur et filtres API ajoutés sur la liste détaillée des signalements, audit mis à jour. |  |
| 2026-04-02 | Codex | Erreurs API harmonisées sur les routes admin restantes les plus exposées et modale `entraide` migrée sur la coque accessible. |  |
| 2026-04-02 | Codex | Squelette de chargement admin réutilisable ajouté et branché sur les principales vues backoffice. |  |
| 2026-04-02 | Codex | Réduction des refetch complets après création / mise à jour sur `animal-posts` et `animal-alerts` avec mise à jour locale des listes et stats. |  |
| 2026-04-02 | Codex | Éditeurs `animal-posts` et `animal-alerts` migrés vers la coque de modale accessible avec feedback `aria-live`. |  |
| 2026-04-02 | Codex | Gestion du focus complétée sur les modales réutilisables: focus initial, cycle `Tab`, fermeture `Escape`, retour focus au déclencheur. |  |
| 2026-04-02 | Codex | États vides actionnables ajoutés sur `reports`, `help-posts`, `animal-posts` et `animal-alerts`, avec séparation des erreurs de formulaire sur les écrans animaux. |  |
| 2026-04-02 | Codex | Feedbacks de succès ajoutés et annoncés sur les créations / mises à jour `reports`, `help-posts`, `animal-posts` et `animal-alerts`, y compris les actions rapides de modération. |  |
| 2026-04-02 | Codex | `Users` ne mélange plus les feedbacks de création et de gestion de compte, avec état vide actionnable ajouté sur la liste filtrée. |  |
| 2026-04-02 | Codex | `Access` aligne maintenant ses états vides avec le composant réutilisable et annonce proprement les feedbacks de page via `aria-live`. |  |
| 2026-04-02 | Codex | Style global `:focus-visible` ajouté pour restaurer un focus clavier clairement visible sur champs, boutons, liens et éléments interactifs. |  |
| 2026-04-02 | Codex | Contrastes renforcés sur plusieurs textes secondaires, métadonnées et liens d'action du dashboard et des listes admin. |  |
| 2026-04-03 | Codex | `overview` utilise désormais un builder serveur partagé entre page et API, avec premier rendu alimenté côté serveur sur `/admin`. |  |
| 2026-04-03 | Codex | `users` adopte à son tour un builder serveur partagé et un premier rendu serveur sur `/admin/utilisateurs`, sans changer les interactions client de gestion. |  |
| 2026-04-03 | Codex | `access` adopte à son tour un builder serveur partagé et un premier rendu serveur sur `/admin/acces`, sans toucher aux mutations et confirmations existantes. |  |
| 2026-04-03 | Codex | `reports` adopte un builder serveur partagé et un premier rendu serveur sur `/admin/signalements` et `/admin/collectivites`, tout en conservant pagination et filtres côté client. |  |
| 2026-04-03 | Codex | `overview` devient plus orienté décision avec une section “Priorités du jour” et des CTA adaptés aux rôles `superadmin`, `admin` et `mairie`. |  |
| 2026-04-03 | Codex | `reports` ajoute une section “File de travail” avec raccourcis d’action et priorités opérationnelles adaptées aux rôles `admin` et `mairie`. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminMetricCard` déployée sur `overview`, `reports`, `users` et `access` pour réduire la duplication et clarifier la hiérarchie des KPI. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminSectionHeader` déployée sur `overview`, `users` et `access` pour homogénéiser les en-têtes de sections et clarifier la structure visuelle. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminPanel` déployée sur `reports`, `users` et `access` pour homogénéiser les conteneurs de sections et mieux distinguer liste vs panneau d’édition. |  |
| 2026-04-03 | Codex | `entraide` et `journal` adoptent un premier rendu serveur via builders partagés, sans casser les mutations client existantes. |  |
| 2026-04-03 | Codex | `animaux-annonces` et `animaux-alertes` adoptent à leur tour un premier rendu serveur via builders partagés, ce qui clôt le lot de chargement hybride sur les vues admin principales. |  |
| 2026-04-03 | Codex | Audit mis à jour pour solder les points terminés: erreurs API, états de chargement, modales accessibles, feedbacks `aria-live`, rendu hybride et `noindex`. |  |
| 2026-04-03 | Codex | `entraide`, `journal`, `animaux-annonces` et `animaux-alertes` adoptent à leur tour `AdminMetricCard`, `AdminPanel` et `AdminSectionHeader` pour réduire la duplication et homogénéiser la structure visuelle. |  |
| 2026-04-03 | Codex | Les vues `entraide`, `animaux-annonces` et `animaux-alertes` ajoutent une file de priorités métier légère pour pousser le backoffice vers un usage plus orienté action. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminRecordCard` déployée sur `reports`, `entraide`, `journal`, `animaux-annonces` et `animaux-alertes` pour homogénéiser les cartes de liste métier. |  |
| 2026-04-03 | Codex | `users`, `access` et `journal` ajoutent à leur tour des panneaux de priorisation rapide pour mettre en avant les comptes à qualifier, les accès à corriger et l’activité récente. |  |
| 2026-04-03 | Codex | Nouvelles primitives `AdminSelectableCard` et `AdminInsetPanel` déployées sur `users` et `access` pour réduire la duplication des cartes sélectionnables et des encarts d’information. |  |
| 2026-04-03 | Codex | `A-013` est requalifié comme dépendance externe: les pages légales et mentions RGPD seront portées par un site statique distinct, à relier depuis le backoffice. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminMiniStat` ajoutée sur `access`, ce qui permet de solder le lot de mutualisation UI `A-011`. |  |
| 2026-04-03 | Codex | Nouvelle primitive `AdminListHeader` ajoutée sur les listes secondaires pour renforcer la lecture desktop et solder la hiérarchie visuelle `A-012`. |  |
| 2026-04-03 | Codex | `A-009` est soldé: toutes les vues admin clés disposent désormais d’une lecture orientée action plutôt que strictement descriptive. |  |

## Historique

Déplacer ici les éléments soldés ou obsolètes en conservant la date et la raison du déplacement.
