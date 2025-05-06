# MapLibre GL JS - Prototype d'implémentation

Ce dossier contient un prototype d'implémentation de MapLibre GL JS pour TagMap, visant à remplacer Leaflet avec une solution offrant une meilleure expérience tactile sur mobile, notamment pour l'édition des formes géométriques (points, lignes, polygones).

## Structure du prototype

- `components/` : Composants Vue.js pour MapLibre
  - `MapLibreTest.vue` : Composant de test démontrant les capacités de MapLibre GL JS et mapbox-gl-draw

- `composables/` : Hooks Vue.js pour simplifier l'utilisation de MapLibre
  - `useMapLibreDrawing.ts` : Gestionnaire de dessin avec points de contrôle optimisés pour le tactile

- `utils/` : Utilitaires et types
  - `maplibreTypes.ts` : Types TypeScript pour MapLibre et ses plugins

## Pourquoi MapLibre GL JS ?

MapLibre GL JS offre plusieurs avantages par rapport à Leaflet, notamment :

1. **Gestion tactile native optimisée**
   - Meilleure détection des gestes tactiles
   - Points de contrôle plus faciles à manipuler sur mobile
   - Architecture conçue pour le multi-touch

2. **Performance WebGL**
   - Rendu via WebGL pour une meilleure performance
   - Animations fluides avec moins de latence
   - Meilleure réactivité pour les interactions tactiles

3. **Fonctionnalités modernes**
   - Support 3D
   - Rotations fluides
   - Styles dynamiques
   - Meilleurs contrôles sur les interactions

## Comment tester

Le prototype est accessible via la route `/maplibre-test` (réservée aux administrateurs).

Il permet de tester :
- Création de points, lignes et polygones
- Modification des formes via les points de contrôle
- Performance et fluidité des interactions tactiles sur mobile
- Manipulation des points de contrôle avec le doigt sur écran tactile

## Plugins utilisés

- **mapbox-gl-draw** : Adapté pour fonctionner avec MapLibre GL JS, ce plugin permet de dessiner et d'éditer des formes géométriques.
  - Points de contrôle agrandis pour une meilleure expérience tactile
  - Styles personnalisés pour une meilleure visibilité
  - Intégration avec le système de dessin de TagMap

## Guide de migration

Si les tests sont concluants, un plan de migration complet sera élaboré pour passer progressivement de Leaflet à MapLibre GL JS. Les principales étapes seront :

1. Création d'un système de bascule par feature flag
2. Migration des composantes cartographiques une par une
3. Tests systématiques sur différents appareils mobiles
4. Validation de l'expérience utilisateur tactile

## Notes techniques

- Les points de contrôle ont été agrandis (10-12px de rayon) pour être plus facilement manipulables au doigt.
- Les événements tactiles sont traités nativement par MapLibre GL JS (pas besoin de mapper les événements touch -> mouse).
- Les styles des formes et points de contrôle ont été ajustés pour une meilleure visibilité sur mobile.