# Contexte Actif du Projet TagMap

## Objectifs actuels

1. **Développement des fonctionnalités de base**
   - Interface de carte interactive
   - Création et gestion des notes géolocalisées
   - Système de permissions par niveau d'accès
   - Gestion des médias (photos)
   - **Permettre à l'administrateur de configurer de manière sécurisée la clé d'API Google Maps via une page Paramètres dédiée, avec stockage côté serveur dans un modèle ApplicationSetting et récupération par le frontend via une API dédiée.**
   - Les salariés peuvent désormais voir et charger les plans sans visiteur associé via un bouton dédié dans MapView.vue (alignement UX avec les entreprises)

2. **Amélioration de l'expérience utilisateur**
   - Interface responsive pour mobile et desktop
   - Navigation intuitive entre les différentes vues
   - Optimisation des performances de chargement

3. **Map Layer Integration**
   - ✅ Implemented Google Maps for high-quality hybrid view
   - **New Requirement**: Display enterprise name on each note for Administrators in the NotesView.vue component
   - ✅ Fixed issue with enterprise_name not being preserved when editing notes
   - Ensuring efficient layer switching and rendering
   - Ensuring cross-platform compatibility
   - Implement proper error handling for map services in case of API failures or quota limits
   - Create a backup plan for map layers if Google Maps API becomes unavailable

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

4. **Assurer un rechargement de secours du dernier plan consulté (fonction `loadLastPlan`) si le chargement du plan initial échoue (404). Correction appliquée pour préserver `lastPlanId` et attendre l'appel.**

## Progression actuelle

### Front-end
- ✅ Interface principale avec carte interactive
- ✅ Système de gestion des notes
- ✅ Système de filtrage par colonnes
- ✅ Système d'authentification
- ✅ Interface de gestion des utilisateurs pour les administrateurs
- ✅ Correction du bug de rechargement automatique du dernier plan consulté (`loadLastPlan`) lorsque le plan spécifié dans l'URL est introuvable (404).
- ✅ Page Paramètres admin accessible uniquement aux administrateurs avec stockage sécurisé côté serveur de la clé d'API Google Maps (modèle ApplicationSetting) et API dédiée pour sa récupération/mise à jour.
- ✅ Service settings.ts créé pour encapsuler les appels API liés aux paramètres, et implémentation dans ParametresView.vue pour utiliser ce service au lieu de l'API directement.
- ✅ Refactorisation des fonctions Google Maps et coordonnées géographiques pour éliminer la duplication de code.

### Back-end
- ✅ API REST pour la gestion des notes
- ✅ Système d'authentification JWT
- ✅ Système de permissions par niveau d'accès
- ✅ Gestion des médias
- 🔄 Optimisation des requêtes pour les données géospatiales

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

## Références
- Documentation API: `/api/docs/`
- Architecture globale: `/docs/architecture.md`
- Exigences produit: `/docs/product_requirement_docs.md`

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

- [2024-07-15] Refactorisation : Création de `dateUtils.ts` pour centraliser toutes les fonctions de formatage et de manipulation des dates. Remplacement des implémentations locales de debounce/throttle par les importations de lodash pour une meilleure performance et maintenabilité. Standardisation des fonctions de traitement des coordonnées avec `extractLatLng` dans `geoUtils.ts`.