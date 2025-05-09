# Product Requirement Document: TagMap

## 1. Project Overview

### Purpose
TagMap is an interactive map-based application designed for managing and annotating geographical information. It allows users to collaborate and visualize data through an interface accessible from both computers and smartphones.

### Problem Statement
Organizations need a centralized way to:
- Document and share geolocation-based information
- Manage access privileges for different stakeholders
- Visualize geographical data with various overlays and filters
- Capture and associate media with geographical locations
- Generate concise reports from map-based information

### Target Users
- Administrators: Complete system access
- Companies/Enterprises: Management of employees and visitors
- Employees: Task visualization assigned by the company
- Visitors: View shared data and communicate via the dialog box

## 2. Core Requirements

### Authentication & Access Control
- User authentication system with four distinct access roles
- Role-based permissions hierarchy (Administrator → Company → Employee → Visitor)
- Customizable visibility settings for notes and map objects

### Map Visualization
- Multiple map layers: Hybrid (satellite + city), Cadastral, IGN
- Selective layer visibility through a checkbox filtering system
- Custom filtering for specific elements (Drilling, Clients, Warehouses, etc.)
- **Administrators can configure the Google Maps API key dynamically via a secure settings page. The key is stored securely in the database and retrieved by the frontend when needed, with no client-side storage of sensitive keys.**

### Geospatial Annotation Features
- Creation of geolocated notes with customizable permissions
- Drawing tools for creating polygons with automatic area calculation
- Line drawing with altimetric profile generation
- Side panel dialog box interface for note management
- Ability to delete the selected shape using a delete button in the Drawing Tools panel (OpenLayers)
- Display enterprise name on each note for Administrators only
- **Centralized control point management**: All control point display and interaction is handled by a dedicated composable (`useMapDrawing.ts`), while geometry utilities (`Line.ts`, `Polygon.ts`) provide only pure geometric computations without UI code.
- **Drawing interactions**: Implemented using OpenLayers Draw and Modify interactions, managed via `useMapDrawing.ts` composable.

### Media Management
- In-app photo capture capability
- Low-resolution storage with 50MB quota per access
- Media association with geographical points

### Route Planning
- Calculation of routes from saved points
- Integration with external mapping services (e.g., Google Maps)

### Report Generation
- PDF synthesis generation for geolocated points, polygons, and altimetric profiles
- Selective point inclusion in reports

### Future API Integrations (Planned)
- GPS tracker with SIM card integration via Ionos server
- Weather station API (https://api.ecowitt.net/)
- SIM card camera integration
- Additional third-party services

### Recherche d'adresse et centrage carte
- Lorsqu'un utilisateur saisit une adresse dans la barre de recherche (SearchBar) en haut de l'interface, une liste de suggestions s'affiche.
- En sélectionnant une adresse, la carte principale (OpenLayers) se centre automatiquement sur la position correspondante et applique un zoom adapté (par défaut 16).
- Ce comportement est assuré via un événement global `map-set-location` : la SearchBar émet cet événement avec les coordonnées, et la carte écoute cet événement pour ajuster la vue.
- Ce mécanisme fonctionne sur desktop et mobile, et garantit une expérience fluide pour la navigation cartographique.

## 3. Non-Functional Requirements

### Performance
- Responsive design for both desktop and mobile interfaces
- Efficient handling of map data to ensure smooth interaction

### Security
- Secure authentication system
- Data privacy aligned with permission settings
- Safe media storage

### Scalability
- Support for increasing numbers of users and data points
- Expandable API integration capabilities

## 4. Success Metrics
- User adoption rate
- Frequency of annotations and media uploads
- Report generation frequency
- User feedback on interface usability
- System performance under load

### UI/UX Enhancements
+ - Display enterprise name visibly on each note card for Administrators only
+ - Pour la compatibilité PWA/mobile, seule la balise `<meta name="mobile-web-app-capable" content="yes">` doit être utilisée dans le HTML principal (voir docs/technical.md pour justification et historique). L'ancienne balise `apple-mobile-web-app-capable` est dépréciée et ne doit plus être utilisée.

## 5. Future Considerations
- Enhanced filtering capabilities
- Additional map visualization options
- Expanded API integration options
- Advanced reporting and analytics features

## Expérience utilisateur cartographique améliorée

- La sélection des lignes, polygones et notes géolocalisées sur la carte est désormais tolérante grâce à Leaflet.AlmostOver : il n'est plus nécessaire de cliquer précisément sur la géométrie.
- Les notes géolocalisées (GeoNotes) restent toujours visibles, même en cas de bug d'affichage ou de disparition DOM, grâce à une gestion avancée de la visibilité et à la recréation dynamique de l'icône si besoin.
- Les effets visuels (surlignage, pulsation, curseur pointer) guident l'utilisateur lors de l'interaction avec la carte.
- Robustesse accrue sur mobile et desktop pour la manipulation des entités cartographiques.

### Exigence UI : Scroll garanti dans les tabs DrawingTools.vue (solution finale)

Chaque onglet du panneau DrawingTools.vue (Outils, Style, Filtres) doit offrir un scroll complet du contenu sur tous les appareils :

1. **Exigence structurelle** : Utiliser une architecture flex avec :
   - Conteneur parent : `flex: 1; min-height: 0; height: 100%; overflow: hidden`
   - Barre d'onglets : hauteur fixe avec `flex-shrink: 0`
   - Contenu d'onglet : `flex: 1; min-height: 0; overflow-y: auto`

2. **Hauteurs adaptatives** :
   - Utiliser des valeurs en pourcentage (`max-height: calc(100% - Xpx)`) plutôt que des valeurs viewport (`vh`) 
   - Ajouter un padding inférieur sur mobile (60px minimum) pour éviter que le contenu ne soit masqué

3. **Éviter** :
   - L'utilisation de hauteurs fixes en pixels pour les conteneurs de contenu
   - Les sélecteurs CSS par attribut (type `div[v-if="..."]`) qui sont fragiles

Cette exigence est critique pour l'ergonomie de l'application, particulièrement sur mobile où tout le contenu doit rester accessible.

## 3. Gestion des accès

### Règles de visibilité des GeoNotes par rôle
| Niveau d'accès | Visible par                          | 
|----------------|--------------------------------------|
| private        | Créateur uniquement                  |
| company        | Entreprise + Admin                   |
| employee       | Entreprise + Salariés + Admin        | 
| visitor        | Tous les utilisateurs de l'entreprise|

#### Implémentation technique par rôle

| Rôle        | Notes accessibles                                                       | Plans accessibles                                 |
|-------------|------------------------------------------------------------------------|---------------------------------------------------|
| ADMIN       | Toutes les notes sans restriction                                       | Tous les plans                                    |
| ENTREPRISE  | Notes privées + company + employee + visitor liées à cette entreprise   | Tous les plans de l'entreprise                    |
| SALARIÉ     | Notes privées + employee + visitor liées à son entreprise               | Tous les plans de l'entreprise, y compris sans visiteur |
| VISITEUR    | Notes privées + visitor liées à l'entreprise de son salarié             | Plans partagés par l'entreprise ou le salarié      |

*Les permissions sont centralisées côté backend dans `GeoNoteViewSet.get_queryset`.*

#### Traitement des enterprise_id

L'implémentation du système de permissions repose sur une gestion précise des identifiants d'entreprise:

1. **Stockage**: Chaque note stocke l'ID de l'entreprise associée dans le champ `enterprise_id`.
2. **Comparaison**: Pour éviter les problèmes de comparaison d'objets, le système extrait l'ID numérique.
3. **Assignation**: Lors de la création d'une note, l'`enterprise_id` est automatiquement défini selon le rôle de l'utilisateur.
4. **Affichage**: Pour les administrateurs, le nom de l'entreprise associée est affiché sur chaque note.

Cette approche garantit que les utilisateurs ne peuvent voir que les notes auxquelles ils devraient avoir accès selon leur rôle et l'entreprise à laquelle ils sont associés.

## Gestion des niveaux d'accès des notes géolocalisées (GeoNote)

Chaque note géolocalisée possède un niveau d'accès (`access_level`) qui détermine qui peut la voir :

- **private** : visible uniquement par le créateur
- **company** : visible par l'entreprise
- **employee** : visible par l'entreprise et ses salariés
- **visitor** : visible par l'entreprise, ses salariés et ses visiteurs

### Matrice d'accès

| Rôle         | private | company | employee | visitor |
|--------------|---------|---------|----------|---------|
| Admin        | ✅      | ✅      | ✅       | ✅      |
| Entreprise   | ✅*     | ✅      | ✅       | ✅      |
| Salarié      | ✅*     |         | ✅       | ✅      |
| Visiteur     | ✅*     |         |          | ✅      |

- ✅* : uniquement si créateur de la note

**Remarque** : L'administrateur a accès à toutes les notes sans restriction. Ce comportement est garanti côté backend.

## Mobile Map Editing (2024-06)

- Users can now edit polygons, lines, and move GeoNotes directly on mobile devices using touch gestures.
- The editing experience is designed to be as intuitive as Google Maps, Figma, or Procreate.
- Control points are larger on mobile for easier touch interaction.
- All drag/move logic is unified for mouse and touch events.
- See `docs/technical.md` for implementation details.

## Nettoyage production : suppression des prints

Tous les appels à `print` ont été supprimés de `api/views.py` pour garantir la conformité production et le respect du cahier des charges. Aucun log de debug ne doit subsister dans le code livré en production.

### [2024-06-10] Itinéraire Google Maps depuis une note géolocalisée

L'utilisateur peut cliquer sur le bouton "Itinéraire" d'une note géolocalisée (depuis le panneau DrawingTools) pour ouvrir directement un itinéraire Google Maps vers la position de la note. Cette fonctionnalité est disponible pour chaque note disposant d'une position géographique et ouvre un nouvel onglet Google Maps avec l'itinéraire calculé. 

# Uniformisation des niveaux d'accès

Tous les composants manipulant des niveaux d'accès (création, édition, filtrage, affichage de notes ou d'éléments cartographiques) utilisent désormais la source unique `ACCESS_LEVELS` définie dans `src/utils/noteHelpers.ts`.

- Les valeurs possibles sont :
  - `private` : Privé — visible uniquement par l'utilisateur
  - `company` : Entreprise — visible par l'entreprise
  - `employee` : Salariés — visible par l'entreprise et ses salariés
  - `visitor` : Visiteurs — visible par l'entreprise, ses salariés et ses visiteurs

- Les labels et descriptions sont centralisés et utilisés dans tous les `<select>` et filtres.
- Le filtre de la carte n'affiche pas l'option "Privé" (car les éléments privés ne sont visibles que par leur créateur).
- Toute modification future des niveaux d'accès doit passer par ce mapping centralisé.

Voir aussi : `src/types/notes.ts` (enum NoteAccessLevel) et `src/types/drawing.ts` (type AccessLevel).

## Frontend Features

- [ ] Map integration with drawing tools
- [2024-07-19] Fixed delete button event binding in MapLibreTest.vue to correctly call handleDrawDelete instead of non-existent deleteSelectedFeature.

### Fonctionnalité : Ajustement de la vue (bouton "Ajuster")

- Le bouton "Ajuster" dans la barre d'outils permet d'adapter automatiquement la vue de la carte pour englober toutes les formes tracées (points, lignes, polygones).
- Si aucune forme n'est présente, la vue revient à l'état initial par défaut.
- Ce comportement fonctionne aussi bien sur desktop que sur mobile.

## Cohérence visuelle des icônes de notes géolocalisées

- L'icône affichée sur la carte pour chaque note géolocalisée (GeoNote) est désormais identique à celle de l'outil dessin "point" dans la barre d'outils.
- Cette évolution garantit une expérience utilisateur cohérente entre la création et la visualisation des notes.
- La couleur du marqueur peut être personnalisée selon les propriétés de chaque note.
- - L'icône GeoNote est maintenant affichée avec une taille fixe plus grande (scale=1.5) pour assurer une visibilité optimale, même à faible niveau de zoom.
- L'icône GeoNote est maintenant affichée avec une taille fixe plus grande (scale=1.5) pour assurer une visibilité optimale, même à faible niveau de zoom.

### [2024-07-20] Suppression de l'affichage de la date/heure sur la carte de note (NotesView.vue)
- L'affichage de la date de création et de modification (createdAt, updatedAt) a été retiré des cartes de note dans la vue NotesView.vue pour simplifier l'interface utilisateur.
- Les informations de date restent disponibles dans le backend et l'API, mais ne sont plus visibles dans la liste principale des notes. 