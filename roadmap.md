# 📱 Dossier de Conception : VivreIci - Cabestany

## Version complète avec roadmap par phases

## 🧭 Vision

VivreIci est une application hyper-locale pensée pour améliorer la vie quotidienne à Cabestany en combinant :

- le **signalement citoyen**
- les **alertes locales utiles**
- l’**entraide de proximité**
- les **alertes animales et la vigilance terrain**
- la **mise en visibilité de la vie locale**
- une future **lecture factuelle de l’état du territoire**

L’objectif n’est pas de tout lancer d’un coup, mais de construire progressivement une application crédible, utile et adoptée.

---

# 🎯 1. Positionnement produit

VivreIci ne remplace pas Facebook.

L’application vient compléter les usages existants avec des briques que Facebook ne gère pas bien :

- géolocalisation précise
- historique structuré
- notifications ciblées
- suivi des problèmes
- vue cartographique
- centralisation des informations utiles
- entraide organisée
- alertes contextuelles par zone

---

# 🧱 2. Principe de construction

Le produit final est ambitieux, mais le lancement doit être progressif.

## Logique globale

### Phase 0 à 1

Créer une application utile même avec très peu d’utilisateurs.

### Phase 2 à 3

Créer de l’engagement et de la récurrence.

### Phase 4 à 5

Créer un vrai réflexe local quotidien.

### Phase 6+

Monétiser, structurer, étendre.

---

# 🚀 3. Roadmap produit complète par phases

---

## PHASE 0 — BOOTSTRAP

### Objectif : partir de zéro sans communauté active

## Contexte

- Groupe Facebook tout juste créé
- Aucun abonné
- Aucune remontée citoyenne
- Aucun historique local exploitable

## But

Donner immédiatement une impression d’utilité et de sérieux.

## Fonctionnalités livrées

- création d’un signalement
- ajout d’une photo
- géolocalisation GPS
- description libre
- liste simple des signalements
- premiers statuts de base (`ouvert`, `en cours`, `résolu`)
- back-office minimal ou gestion manuelle

## Actions produit recommandées

- créer toi-même les premiers signalements
- documenter quelques cas concrets
- remplir la carte avec de vrais exemples locaux
- produire des captures et mini démonstrations

## KPI de phase

- app fonctionnelle
- 5 à 15 signalements initiaux
- premiers retours qualitatifs

---

## PHASE 1 — MVP UTILE

### Objectif : rendre le signalement crédible et agréable à utiliser

## Brique centrale

### Signalement urbain intelligent

Types initiaux recommandés :

- voirie
- déchets
- éclairage
- mobilier urbain
- sécurité légère / gêne locale

## Fonctionnalités

- formulaire de signalement simple
- upload photo
- récupération GPS
- affichage sur carte
- détail d’un signalement
- envoi email facultatif ou semi-automatique
- filtre par type
- filtre par statut
- horodatage

## Feature indispensable

### Carte interactive

La carte devient le centre de lecture du territoire.

## Bénéfices

- visualiser immédiatement les problèmes
- comprendre où agir
- éviter une app “liste brute”
- préparer les futures alertes de zone

## KPI de phase

- 10 à 30 utilisateurs test
- premiers signalements externes
- premiers usages répétitifs

---

## PHASE 2 — ANTI-DOUBLON ET VALIDATION COMMUNAUTAIRE

### Objectif : éviter le spam et structurer l’information

## Fonctionnalités

- détection de doublons géographiques
- suggestion “déjà signalé ?”
- vote / confirmation d’un problème existant
- ajout de photo complémentaire sur un signalement existant
- compteur de confirmations
- regroupement logique de signalements proches

## Logique anti-doublon

Critères simples :

- rayon d’environ 30 m
- même type
- période récente

## Résultat UX

Au lieu de créer 10 fiches pour le même nid-de-poule :

- un point principal
- plusieurs confirmations
- plus de crédibilité
- meilleure priorisation

## KPI de phase

- baisse des doublons
- hausse des confirmations
- meilleure lisibilité de la carte

---

## PHASE 3 — ALERTES LOCALES

### Objectif : donner une raison de revenir même sans signaler soi-même

C’est ici qu’on ajoute la dimension “app du quotidien”.

## Fonctionnalités d’alertes

- alertes vent fort / tramontane
- alertes pollen
- restrictions d’eau
- fermeture de parc
- travaux en cours
- coupures ou incidents locaux
- alertes circulation locale si pertinentes
- alertes ponctuelles de sécurité ou d’attention

## Logique UX

L’utilisateur ne vient plus seulement pour signaler.
Il vient aussi pour :

- vérifier s’il y a une alerte locale
- savoir ce qui change aujourd’hui dans la commune
- recevoir une info contextualisée

## Modes d’affichage

- tableau de bord “Aujourd’hui à Cabestany”
- cartes d’alerte
- filtres par catégorie
- notifications ciblées selon la zone ou le thème

## Valeur produit

Cette phase transforme l’application :

- d’un outil de remontée
- en un outil de consultation régulière

## KPI de phase

- hausse du retour quotidien / hebdomadaire
- premiers abonnements aux notifications
- augmentation du temps passé

---

## PHASE 4 — ANIMAUX & ALERTES TERRAIN

### Objectif : couvrir les risques et événements liés aux animaux, utiles au quotidien

Cette phase ajoute un pilier très concret pour les habitants, en particulier :

- les familles
- les promeneurs
- les propriétaires de chiens
- les habitants proches des parcs, chemins et zones naturelles

## 4.1 Vigilance animale

### Cas d’usage

- chenilles processionnaires observées
- épillets dangereux dans certaines zones
- présence inhabituelle d’animaux errants
- zone à éviter temporairement avec un chien
- signalement de nuisibles ou danger localisé

## Fonctionnalités

- catégorie “Alerte animale”
- géolocalisation précise du danger
- photo optionnelle
- niveau de gravité
- date d’observation
- durée de validité de l’alerte
- statut actif / expiré / résolu
- affichage sur carte avec icône dédiée

## Sous-types recommandés

- chenilles processionnaires
- épillets
- animal errant
- animal blessé
- zone sensible temporaire
- autre vigilance animale

## UX attendue

Un habitant peut ouvrir l’app avant une balade et voir immédiatement :

- s’il existe un danger animalier à proximité
- dans quel parc ou quelle rue
- si l’alerte est récente ou non

---

## 4.2 Animaux perdus / trouvés

### Cas d’usage

- chien perdu
- chat retrouvé
- animal aperçu sans propriétaire
- animal identifié comme retrouvé

## Fonctionnalités

- fiche animal perdu / trouvé
- photo
- nom de l’animal si connu
- dernière localisation vue
- date / heure
- contact
- statut `perdu`, `aperçu`, `retrouvé`
- visibilité sur carte
- partage facile

## Logique produit

L’objectif n’est pas de créer un mini réseau social animalier.
L’objectif est d’aider rapidement à :

- diffuser une info utile
- localiser une zone d’observation
- accélérer les retrouvailles

---

## 4.3 Alertes animales push / email / web

### Objectif

Prévenir les personnes concernées au bon moment et au bon endroit.

## Types d’alertes à prévoir

- nouvelle alerte chenilles dans un rayon défini
- nouvelle alerte épillets proche d’un parc
- animal perdu signalé à proximité
- animal retrouvé correspondant à une alerte existante
- alerte expirée ou résolue

## Personnalisation

L’utilisateur peut choisir :

- son rayon d’alerte
- les catégories suivies
- s’il veut recevoir les alertes immédiatement ou en digest
- s’il possède un chien / chat / aucun animal

## Logique UX

Exemples :

- “Alerte chenilles signalée près du Parc Guilhem”
- “Un chien perdu a été aperçu à moins de 1 km”
- “La zone signalée pour épillets est désormais marquée comme résolue”

---

## 4.4 Intégration avec la carte

La carte doit permettre de distinguer visuellement :

- les signalements urbains
- les alertes locales
- les alertes animales
- les animaux perdus / trouvés

## Affichage recommandé

- icônes distinctes
- filtres dédiés
- vue rapide par catégorie
- état actif / expiré
- possibilité de masquer certaines couches

---

## 4.5 Valeur produit de la phase animale

Cette phase apporte :

- un vrai usage récurrent
- une forte utilité terrain
- une bonne compatibilité avec les habitudes de promenade
- un potentiel de bouche-à-oreille élevé

## KPI de phase

- nombre d’alertes animales consultées
- nombre d’abonnements aux alertes
- nombre d’animaux retrouvés / signalés
- réutilisation hebdomadaire de l’app

---

## PHASE 5 — ENTRAIDE DE PROXIMITÉ

### Objectif : faire de VivreIci une app communautaire, pas seulement fonctionnelle

Ici on ajoute la dimension humaine.

## Cas d’usage entraide

- objet perdu / retrouvé
- demande d’aide de proximité
- alerte ponctuelle utile au voisinage
- petit service local
- information communautaire simple
- relais d’une demande utile et locale

## Modules possibles

### Objets perdus / trouvés

- photo
- lieu
- catégorie
- contact

### Entraide locale légère

- “quelqu’un a vu… ?”
- “qui peut m’aider à… ?”
- “je peux donner / prêter…”
- “je cherche un coup de main près de chez moi”

## Garde-fous à prévoir

- modération
- durée de vie des posts
- catégories simples
- signalement d’abus
- charte d’usage

## Valeur produit

Cette phase crée l’attachement émotionnel à l’app.

---

## PHASE 6 — PREUVE D’IMPACT ET VIE DE LA COMMUNE

### Objectif : montrer que l’application a une utilité réelle

## Fonctionnalités

- avant / après
- historique des actions
- statut des signalements dans le temps
- timeline locale
- mises en avant de problèmes résolus
- statistiques simples visibles publiquement

## Exemples

- “3 signalements cette semaine”
- “2 problèmes résolus”
- “zone la plus active”
- “problème confirmé par 12 habitants”
- “2 alertes chenilles résolues”
- “1 animal retrouvé”

## Complément : Vie locale utile

- commerçants de proximité
- anti-gaspi
- infos utiles du jour
- événements simples
- fermetures exceptionnelles
- nouveautés de quartier

## Attention produit

La vie locale doit rester :

- utile
- brève
- locale
- non envahissante

## KPI de phase

- hausse du partage
- hausse de la confiance
- visibilité organique locale

---

## PHASE 7 — ENGAGEMENT ET GAMIFICATION

### Objectif : créer une habitude et valoriser la participation

## Fonctionnalités

- score citoyen
- badges
- niveaux
- historique de contributions
- contributeurs mis en avant
- récompenses symboliques

## Exemple de progression

- Nouveau voisin
- Observateur local
- Gardien de Cabestany
- Légende locale

## Attribution simple

- +10 signalement
- +5 confirmation utile
- +50 problème résolu confirmé
- badge spécial entraide
- badge vigilance animale
- badge animal retrouvé

## Attention

La gamification vient après l’utilité réelle.
Elle ne doit jamais devenir le moteur principal trop tôt.

---

## PHASE 8 — OUTILS PRO / TABLEAU DE BORD

### Objectif : structurer les données pour un usage plus institutionnel ou commercial

## Cibles futures

- mairie
- associations
- commerçants
- collectifs locaux
- structures de protection animale

## Fonctionnalités

- dashboard d’administration
- filtrage avancé
- export CSV / PDF
- délais moyens
- volume par catégorie
- heatmap
- suivi des zones récurrentes
- modération centralisée
- vue spécifique alertes animales

## Valeur

Cette phase ne doit arriver qu’après accumulation de données crédibles.

---

## PHASE 9 — MONÉTISATION

### Objectif : rendre le modèle soutenable

## Volet B2B

### Partenaires locaux

- offres flash
- anti-gaspi
- mise en avant locale
- notifications sponsorisées limitées

## Volet services utiles

- partenaires animaliers ou commerces locaux ciblés
- visibilité locale pertinente et encadrée

## Volet B2G / institutionnel

- dashboard
- accès structuré aux signalements
- rapports mensuels
- vue consolidée

## Règle importante

La monétisation ne doit jamais casser la confiance citoyenne.

---

## PHASE 10 — RÉPLICATION GÉOGRAPHIQUE

### Objectif : transformer le modèle local en produit duplicable

## Cibles possibles

- Saleilles
- Perpignan Sud
- Canet
- autres communes voisines

## Conditions préalables

- modèle validé
- UX reproductible
- coûts maîtrisés
- méthode de lancement claire

---

# 🧩 4. Vue d’ensemble des grands piliers du produit final

À terme, VivreIci repose sur 6 piliers.

## 1. Signalement

Remonter les problèmes du quotidien.

## 2. Carte

Voir le territoire de manière visuelle et vivante.

## 3. Alertes

Informer utilement les habitants.

## 4. Animaux

Protéger, prévenir et aider à retrouver.

## 5. Entraide

Créer du lien de proximité.

## 6. Impact

Montrer ce qui évolue et ce qui compte.

---

# 💰 5. Business model réaliste par maturité

## Niveau 1 — lancement

- gratuit
- zéro revenu
- objectif : preuve d’usage

## Niveau 2 — traction

- tests commerçants
- visibilité locale limitée
- offres partenaires

## Niveau 3 — structuration

- dashboard professionnel
- partenariats institutionnels ou associatifs
- services avancés

---

# 📣 6. Go-To-Market progressif

## Départ

- seed data
- contenu créé par toi
- démonstrations terrain

## Activation locale

- proches
- voisins
- premiers membres du groupe Facebook
- bouche-à-oreille

## Croissance

- bilans réguliers
- posts concrets
- captures avant / après
- alertes utiles partagées
- cas concrets d’animaux retrouvés ou de zones à éviter

---

# 💻 7. Stack technique

| Couche       | Technologie             | Rôle                            |
| ------------ | ----------------------- | ------------------------------- |
| Frontend     | Next.js                 | application web / PWA           |
| Backend      | Supabase                | base de données, auth, realtime |
| Stockage     | Supabase Storage        | photos                          |
| Emails       | Resend                  | envois automatiques             |
| Déploiement  | Vercel                  | hébergement                     |
| Cartographie | Leaflet + OpenStreetMap | carte sans coût API             |

---

# 🛠 8. Structure de données initiale

## Table `reports`

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT,
  status TEXT DEFAULT 'open',
  lat FLOAT,
  lng FLOAT,
  photo_url TEXT,
  description TEXT,
  votes INTEGER DEFAULT 1,
  cluster_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Table `animal_alerts`

```sql
CREATE TABLE animal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alert_type TEXT, -- chenilles, epillets, animal_errant, animal_blesse, zone_sensible
  title TEXT,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  lat FLOAT,
  lng FLOAT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Table `lost_pets`

```sql
CREATE TABLE lost_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  pet_name TEXT,
  status TEXT DEFAULT 'lost', -- lost, seen, found
  photo_url TEXT,
  description TEXT,
  contact_info TEXT,
  lat FLOAT,
  lng FLOAT,
  last_seen_at TIMESTAMPTZ,
  is_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tables futures possibles

- alerts
- local_posts
- merchants_offers
- report_confirmations
- notifications_subscriptions
- animal_alert_subscriptions

---

# 🗓 9. Plan d’implémentation réaliste

## Étape 1

- auth
- création signalement
- stockage photo
- liste

## Étape 2

- carte
- détail d’un point
- filtres simples

## Étape 3

- anti-doublon
- votes
- confirmations

## Étape 4

- module alertes locales
- dashboard “Aujourd’hui”

## Étape 5

- module animaux perdus / trouvés
- alertes animales
- abonnement aux alertes animales

## Étape 6

- entraide simple
- avant / après
- stats
- engagement

---

# ⚠️ 10. Risques principaux

## 1. App vide au départ

Solution : seed data et démonstrations.

## 2. Peu de participation initiale

Solution : simplifier au maximum l’usage.

## 3. Trop de fonctionnalités trop tôt

Solution : phase par phase.

## 4. Bruit / doublons / confusion

Solution : carte + anti-doublon + modération.

## 5. Fonctionnalités communautaires trop ouvertes

Solution : catégories strictes et cadre clair.

## 6. Trop d’alertes animales ou alertes inutiles

Solution : durée de vie courte, filtres, validation minimale, personnalisation.

---

# 🏁 11. Conclusion

Le produit final doit bien inclure :

- le **signalement**
- les **alertes**
- la **vigilance animale**
- les **animaux perdus / trouvés**
- l’**entraide**
- la **vie locale**
- la **preuve d’impact**
- à terme des **outils de pilotage**

Mais ces briques doivent être introduites dans le bon ordre.

## Ordre stratégique recommandé

1. signalement
2. carte
3. anti-doublon
4. alertes locales
5. animaux + alertes animales
6. entraide
7. preuve d’impact
8. engagement
9. outils pro
10. monétisation
11. réplication

---

## Vision long terme

VivreIci peut devenir, à terme, l’interface locale du quotidien :

- pour voir
- pour signaler
- pour s’entraider
- pour protéger ses animaux
- pour recevoir des alertes utiles
- pour rester informé
- pour comprendre ce qui se passe réellement autour de soi
