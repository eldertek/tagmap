# Contexte Actif du Projet TagMap

## Objectifs actuels

1. **Développement des fonctionnalités de base**
   - Interface de carte interactive
   - Création et gestion des notes géolocalisées
   - Système de permissions par niveau d'accès
   - Gestion des médias (photos)
   - **Permettre à l'administrateur de configurer de manière sécurisée la clé d'API Google Maps via une page Paramètres dédiée, avec stockage côté serveur dans un modèle ApplicationSetting et récupération par le frontend via une API dédiée.**

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

## Progression actuelle

### Front-end
- ✅ Interface principale avec carte interactive
- ✅ Système de gestion des notes
- ✅ Système de filtrage par colonnes
- ✅ Système d'authentification
- ✅ Interface de gestion des utilisateurs pour les administrateurs
- 🔄 Optimisation des performances sur mobile
- ✅ Page Paramètres admin accessible uniquement aux administrateurs avec stockage sécurisé côté serveur de la clé d'API Google Maps (modèle ApplicationSetting) et API dédiée pour sa récupération/mise à jour.
- ✅ Service settings.ts créé pour encapsuler les appels API liés aux paramètres, et implémentation dans ParametresView.vue pour utiliser ce service au lieu de l'API directement.

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

## Notes importantes
- La sauvegarde automatique des notes est activée
- Les performances sur mobile sont une priorité pour la prochaine phase
- Le système de permissions est centralisé côté backend pour plus de sécurité
- Lors de l'édition des notes, il faut préserver l'enterprise_name pour maintenir l'affichage pour les admins

## Références
- Documentation API: `/api/docs/`
- Architecture globale: `/docs/architecture.md`
- Exigences produit: `/docs/product_requirement_docs.md` 