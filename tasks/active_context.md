# Contexte Actif du Projet TagMap

## Objectifs actuels

1. **Développement des fonctionnalités de base**
   - Interface de carte interactive
   - Création et gestion des notes géolocalisées
   - Système de permissions par niveau d'accès
   - Gestion des médias (photos)
   - **Permettre à l'administrateur de configurer de manière sécurisée la clé d'API Google Maps via une page Paramètres dédiée, avec stockage côté serveur dans un modèle ApplicationSetting et récupération par le frontend via une API dédiée.**
   - Les salariés peuvent désormais voir et charger les plans sans visiteur associé via un bouton dédié dans MapView.vue (alignement UX avec les entreprises)
   - Centralisation de toute la logique des points de contrôle (création, mise à jour et interaction) dans le composable `useMapDrawing.ts`, séparée des utilitaires géométriques.
   - Mise à jour réactive des géométries lors du glissement des points de contrôle (`translating` dans `useMapDrawing.ts`).

2. **Amélioration de l'expérience utilisateur**
   - Interface responsive pour mobile et desktop
   - Navigation intuitive entre les différentes vues
   - Optimisation des performances de chargement
   - **Suppression de l'affichage de la date/heure sur la carte de note (NotesView.vue) :** la date de création et de modification n'est plus affichée sur les cartes de note pour alléger l'interface. Les champs restent présents dans le modèle/API mais ne sont plus visibles dans la liste des notes.
   - **Résolution des problèmes d'interactions tactiles sur mobile, particulièrement pour l'édition des formes via les points de contrôle**
   - Permettre de cliquer sur une forme existante lorsque aucun outil de dessin n'est sélectionné pour entrer en mode sélection et modifier via les points de contrôle
   - **Non-regression requirement:** The Geoman drawing mode mapping for MapLibre must always match the mapping table in docs/technical.md (e.g., 'draw_polygon', 'draw_line_string', 'draw_point'). Any future changes to drawing tools must verify this mapping is correct.

3. **Map Layer Integration**
   - ✅ Implemented Google Maps for high-quality hybrid view
   - ✅ Implemented composite Cadastre view (Google Maps hybrid + cadastre overlay)
   - **New Requirement**: Display enterprise name on each note for Administrators in the NotesView.vue component
   - ✅ Fixed issue with enterprise_name not being preserved when editing notes
   - Ensuring efficient layer switching and rendering
   - Ensuring cross-platform compatibility
   - Implement proper error handling for map services in case of API failures or quota limits
   - Create a backup plan for map layers if Google Maps API becomes unavailable
   - Experimental OpenLayers integration (src/openlayers) for new map stack

4. **Centralisation des utilitaires**
   - ✅ Création de fonctions utilitaires centralisées pour Google Maps dans `googleMapsLoader.ts`
   - ✅ Amélioration de `geoUtils.ts` avec des fonctions de conversion de coordonnées
   - ✅ Création de `dateUtils.ts` avec fonctions standardisées pour la manipulation des dates
   - ✅ Remplacement des implémentations locales de debounce/throttle par les fonctions lodash
   - ✅ Suppression des doublons de code dans GeoNote.ts, NotesView.vue, MeteoView.vue et NoteEditModal.vue
   - ✅ Standardisation des types de données géographiques (LatLng, CoordinateType)

## Défis techniques actuels

1. **Performance du rendu cartographique**
   - Optimisation du chargement des éléments géospatiaux
   - Gestion efficace de la mémoire avec de nombreux marqueurs

2. **Gestion de la synchronisation en temps réel**
   - Mise à jour en temps réel des notes et des formes dessinées
   - Minimisation des conflits lors des éditions simultanées

3. **Intégration multiplateforme**
   - Support cohérent sur tous les navigateurs
   - Adaptation aux différentes tailles d'écran
   - Gestion optimale des performances sur appareils mobiles
   - **Amélioration des interactions tactiles pour l'édition des formes (points de contrôle)**

4. **Assurer un rechargement de secours du dernier plan consulté (fonction `loadLastPlan`) si le chargement du plan initial échoue (404). Correction appliquée pour préserver `lastPlanId` et attendre l'appel.**

## Progression actuelle

### Front-end
- ✅ Interface principale avec carte interactive
- ✅ Système de gestion des notes
- ✅ Système de filtrage par colonnes
- ✅ Système d'authentification
- ✅ Interface de gestion des utilisateurs pour les administrateurs
- ✅ Correction du bug de rechargement automatique du dernier plan consulté (`loadLastPlan`) lorsque le plan spécifié dans l'URL est introuvable (404).
- ✅ Correction du warning Vue : propriété "deleteSelectedFeature" référencée sans définition dans le template; renommage du binding `@delete-shape` en `handleDrawDelete` dans MapLibreTest.vue
- ✅ Page Paramètres admin accessible uniquement aux administrateurs avec stockage sécurisé côté serveur de la clé d'API Google Maps (modèle ApplicationSetting) et API dédiée pour sa récupération/mise à jour.
- ✅ Service settings.ts créé pour encapsuler les appels API liés aux paramètres, et implémentation dans ParametresView.vue pour utiliser ce service au lieu de l'API directement.
- ✅ Refactorisation des fonctions Google Maps et coordonnées géographiques pour éliminer la duplication de code.

### Back-end
- ✅ API REST pour la gestion des notes
- ✅ Système d'authentification JWT
- ✅ Système de permissions par niveau d'accès
- ✅ Gestion des médias
- 🔄 Optimisation des requêtes pour les données géospatiales

## Problématique mobile et options techniques

Actuellement, TagMap rencontre des limitations pour la gestion tactile sur mobile, notamment avec la manipulation des points de contrôle pour l'édition des formes (polygones, lignes). Malgré les adaptations CSS et les hacks d'événements, l'expérience tactile reste sous-optimale.

### Trois options sont à l'étude:

1. **Continuer à améliorer Leaflet (solution actuelle)**
   - Avantages: Continuité, intégration existante
   - Inconvénients: Limitations structurelles, hacks compliqués

2. **Développer une solution tactile maison**
   - Avantages: Contrôle total sur l'UX
   - Inconvénients: Complexité élevée, maintenance difficile

3. **Migration vers MapLibre GL JS (recommandée)**
   - Avantages: Gestion tactile native, performances WebGL
   - Inconvénients: Migration substantielle

Une analyse détaillée est disponible dans:
- `docs/maplibre_vs_leaflet.md`: Comparaison technique des deux bibliothèques
- `tasks/maplibre_migration_analysis.md`: Plan d'approche pour une potentielle migration

La prochaine étape consiste à développer un prototype MapLibre pour valider les gains réels en termes d'UX mobile avant toute décision définitive.

## Optimisations planifiées

1. **Optimisation des performances**
   - Mise en cache des tuiles cartographiques
   - Chargement progressif des données géospatiales
   - Réduction du bundle JavaScript

2. **Améliorations UX**
   - Animations plus fluides
   - Temps de réponse améliorés
   - Meilleure gestion des erreurs côté utilisateur

3. **Améliorations de la maintenabilité**
   - Continuer la centralisation des fonctions utilitaires communes
   - Standardiser les patterns de code à travers le projet
   - Améliorer la documentation technique

## Notes importantes
- La sauvegarde automatique des notes est activée
- Les salariés peuvent désormais voir et charger les plans sans visiteur associé via un bouton dédié dans MapView.vue
- Les performances sur mobile sont une priorité pour la prochaine phase
- Le système de permissions est centralisé côté backend pour plus de sécurité
- Lors de l'édition des notes, il faut préserver l'enterprise_name pour maintenir l'affichage pour les admins
- Les fonctions d'ouverture de liens Google Maps et de conversion de coordonnées sont maintenant centralisées dans les utilitaires dédiés
- L'icône des GeoNotes sur la carte est synchronisée avec celle de l'outil dessin "point" (SVG DrawingTools.vue). Toute évolution de l'icône dans l'UI doit être répercutée sur la carte. La couleur du marqueur reste personnalisable selon les propriétés de la note.

## Références
- Documentation API: `/api/docs/`
- Architecture globale: `/docs/architecture.md`
- Exigences produit: `/docs/product_requirement_docs.md`
- Analyse MapLibre vs Leaflet: `/docs/maplibre_vs_leaflet.md`
- Plan de migration: `/tasks/maplibre_migration_analysis.md`

- Mobile editing for polygons, lines, and GeoNotes is now supported. Control points are touch-friendly and larger on mobile. All drag/move logic is unified for mouse and touch. See docs/technical.md for implementation details and test plan.

- Suppression de tous les appels à print dans api/views.py pour nettoyage production et conformité au cahier des charges.

# Rappel : Matrice d'accès des notes géolocalisées (GeoNote)
| Rôle         | private | company | employee | visitor |
|--------------|---------|---------|----------|---------|
| Admin        | ✅      | ✅      | ✅       | ✅      |
| Entreprise   | ✅*     | ✅      | ✅       | ✅      |
| Salarié      | ✅*     |         | ✅       | ✅      |
| Visiteur     | ✅*     |         |          | ✅      |
- ✅* : uniquement si créateur de la note

L'admin doit toujours voir toutes les notes. Ce contexte doit être respecté dans tous les développements et tests.

- [2024-06-10] Fonctionnalité : Ouverture d'un itinéraire Google Maps depuis une note géolocalisée via DrawingTools.vue (méthode openInGoogleMaps sur GeoNote). Le bouton "Itinéraire" ouvre un nouvel onglet Google Maps vers la position de la note sélectionnée.

- [2024-07-05] Refactorisation : Centralisation des fonctions utilitaires pour Google Maps (`googleMapsLoader.ts`) et coordonnées géographiques (`geoUtils.ts`). Mise à jour des composants GeoNote.ts, NotesView.vue et MeteoView.vue pour utiliser ces utilitaires partagés.

- [2024-07-10] Correction : Les fonds de carte IGN et Cadastre dans MapLibreTest.vue utilisaient des URLs obsolètes (wxs.ign.fr) provoquant des erreurs réseau. Les URLs ont été remplacées par les endpoints publics data.geopf.fr, comme dans useMapState.ts. Cette correction garantit la disponibilité des couches et la cohérence entre les composants MapLibre et Leaflet. Toute modification future des fonds de carte doit être synchronisée dans la doc et les tests.

- [2024-07-15] Refactorisation : Création de `dateUtils.ts` pour centraliser toutes les fonctions de formatage et de manipulation des dates. Remplacement des implémentations locales de debounce/throttle par les importations de lodash pour une meilleure performance et maintenabilité. Standardisation des fonctions de traitement des coordonnées avec `extractLatLng` dans `geoUtils.ts`.

- [2024-07-15] Mise à jour : Le proxy backend pour les tuiles hybrides Google Maps utilise désormais l'API officielle Map Tiles : POST /v1/createSession pour obtenir un session token, puis GET /v1/2dtiles/{z}/{x}/{y}?session=... pour chaque tuile. La clé API reste strictement côté serveur, les logs d'erreur sont structurés, et le flux est conforme à la documentation Google. Toute évolution future du flux doit être synchronisée dans la documentation technique et les tests automatisés.

- [2024-07-18] Amélioration : La configuration des tuiles hybrides a été optimisée pour assurer la compatibilité entre Leaflet et MapLibre GL. La requête de session utilise désormais explicitement `mapType="satellite"` avec `layerTypes=["layerRoadmap"]` pour obtenir l'effet hybride (satellite + routes/labels). MapLibreTest.vue a été mis à jour pour utiliser ces tuiles avec un cache-buster et une attribution améliorée. Cela garantit une expérience cartographique cohérente quelle que soit la bibliothèque utilisée.

# Contexte actif : Uniformisation des niveaux d'accès

- Toute gestion, affichage ou filtrage de niveau d'accès doit utiliser le mapping ACCESS_LEVELS de src/utils/noteHelpers.ts.
- Les valeurs autorisées sont : private, company, employee, visitor (voir enum NoteAccessLevel).
- Les tests doivent vérifier la cohérence des labels, la propagation des changements et l'absence de divergence entre composants.
- Le filtre de la carte n'affiche pas l'option "Privé".

# Contexte actif : Optimisation tactile mobile

Une analyse approfondie des options pour améliorer l'expérience tactile sur mobile a été réalisée. Elle conclut que:
1. Les limitations actuelles de Leaflet sont structurelles et difficilement contournables
2. La meilleure approche serait une migration vers MapLibre GL JS qui offre un support tactile natif
3. Un prototype doit être développé pour valider les gains réels avant toute décision

- Permettre de cliquer sur une GeoNote existante lorsque aucun outil de dessin n'est sélectionné pour entrer en mode sélection et accéder aux actions spécifiques (Éditer, Itinéraire, Supprimer) dans le panneau DrawingTools
- Permettre de cliquer sur une forme existante lorsque aucun outil de dessin n'est sélectionné pour entrer en mode sélection et modifier via les points de contrôle