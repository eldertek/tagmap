# TagMap Technical Documentation

## Development Environment

### Prerequisites
- Python 3.13
- Node.js (latest LTS version)
- PostgreSQL with PostGIS extension
- Git

### Local Development Setup

#### Backend Setup
1. Clone the repository
   ```bash
   git clone <repository-url>
   cd tagmap
   ```

2. Create and activate a virtual environment
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Set up the database
   ```bash
   # Create PostgreSQL database with PostGIS extension
   createdb tagmap
   psql -d tagmap -c "CREATE EXTENSION postgis;"
   
   # Apply migrations
   python manage.py migrate
   ```

5. Create a superuser
   ```bash
   python manage.py createsuperuser
   ```

6. Run the development server
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup
1. Navigate to the frontend directory
   ```bash
   cd frontend/tagmap
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

### Environment Variables
Create a `.env` file in the project root:
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgis://user:password@localhost/tagmap
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## Technology Stack

### Backend
- **Framework**: Django 5.1.6
- **API**: Django REST Framework 3.15.2
- **Geospatial**: GeoDjango with PostGIS
- **Authentication**: Django REST Framework SimpleJWT
- **Database**: PostgreSQL with PostGIS extension
- **CORS Handling**: django-cors-headers
- **Nested Routes**: drf-nested-routers

### Frontend
- **Framework**: Vue.js 3
- **Build Tool**: Vite
- **Map Library**: Leaflet
- **Experimental Map Library**: OpenLayers (`src/openlayers`)
- **OpenLayers State Management**: `useMapState` now uses a singleton pattern to ensure `MapView` and `MapToolbar` share the same map instance for consistent layer switching.
- **State Management**: Vuex or Pinia
- **HTTP Client**: Axios
- **CSS Framework**: Custom styling with responsive design
- **Auto-Save Feature**: Frontend now automatically triggers plan save every minute and upon any drawing modification (creation, deletion, update).
- **Les salariés peuvent voir et charger les plans sans visiteur associé, via un bouton dédié dans MapView.vue (cohérence UX avec les entreprises).**

### Drawing Tool Mode Mapping (MapLibre-Geoman)

> **Important:** When enabling drawing modes with MapLibre-Geoman, you must use the correct mode names as expected by the plugin. Using incorrect names (e.g., 'Polygon', 'Polyline', 'Marker') will result in errors such as "Unable to enable mode, ... is not available".

**Mapping table:**

| UI Tool Name | Geoman Mode Name      |
|--------------|-----------------------|
| Polygon      | polygon               |
| Line         | line_string           |
| Note         | point                 |

**Usage Example:**
```js
const modeMap = {
  'Polygon': 'polygon',
  'Line': 'line_string',
  'Note': 'point'
};
const drawMode = modeMap[tool];
mapInstance.value.gm.enableDraw(drawMode);
```

- Always refer to the [@geoman-io/maplibre-geoman-free documentation](https://github.com/geoman-io/maplibre-geoman-free#api) for the latest mode names.
- Update this table if new drawing modes are added or if the plugin changes its API.

### Testing
- **Backend**: Django Test Framework, pytest-django
- **Frontend**: Jest, Vue Test Utils
- **Coverage**: coverage.py

### Code Quality
- **Linting**: Flake8, Black (backend), ESLint (frontend)
- **Type Checking**: mypy (backend), TypeScript (frontend)

## Project Structure

### Backend

```
tagmap/
├── api/                 # Main API app
│   ├── migrations/      # Database migrations
│   ├── models.py        # Data models
│   ├── serializers.py   # API serializers
│   ├── urls.py          # API routes
│   └── views.py         # API views
├── authentication/      # Authentication app
│   ├── migrations/
│   ├── models.py        # User models
│   └── views.py         # Auth views
├── plans/               # Planning features
│   ├── migrations/
│   ├── models.py        # Planning models
│   └── views.py         # Planning views
├── media/               # Media storage
├── static/              # Static files
├── tagmap/              # Project configuration
│   ├── settings.py      # Django settings
│   ├── urls.py          # Main URL configuration
│   └── wsgi.py          # WSGI configuration
├── templates/           # HTML templates
├── manage.py            # Django management script
└── requirements.txt     # Python dependencies
```

### Frontend

```
frontend/tagmap/
├── public/              # Static public assets
│   └── assets/          # Images, fonts, etc.
├── src/                 # Source code
│   ├── assets/          # Static assets
│   ├── components/      # Vue components
│   │   └── auth/        # Authentication components
│   ├── composables/     # Vue composables
│   ├── lib/             # Third-party libraries
│   │   └── leaflet/     # Leaflet map library
│   ├── openlayers/      # Experimental OpenLayers integration
│   ├── router/          # Vue Router configuration
│   ├── services/        # API services
│   ├── stores/          # Vuex/Pinia stores
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── views/           # Page components
│   ├── App.vue          # Root component
│   └── main.js          # Application entry point
├── .eslintrc.js         # ESLint configuration
├── package.json         # NPM dependencies
└── vite.config.js       # Vite configuration
```

## Key Technical Decisions

### Geospatial Stack
The project uses GeoDjango with PostGIS for handling geospatial data. This combination provides:
- Powerful spatial query capabilities
- Support for various geometry types
- Spatial indexing for performance
- Integration with Django's ORM

### Authentication Strategy
JWT-based authentication with Django REST Framework SimpleJWT provides:
- Stateless authentication
- Token refresh mechanisms
- Role-based access control
- Integration with Django's permission system

### Frontend Architecture
Vue.js 3 with the Composition API offers:
- Reactive component model
- Excellent performance
- Type safety with TypeScript
- Flexible component composition

### Utility Functions Organization
To maintain a clean architecture and avoid code duplication, the following utility patterns are used:

- **UI vs Geometry Separation**: Control point UI logic lives exclusively in the `useMapDrawing.ts` composable; geometry-only methods (midpoints, moveVertex, addVertex) remain in `Line.ts` and `Polygon.ts` without any Leaflet interaction code.
- **Utility Modules**: Specialized utility files in `src/utils/` provide reusable functions:
  - `dateUtils.ts`: Date formatting and manipulation with robust error handling
  - `geoUtils.ts`: Coordinate handling and geographic format conversion (GeoJSON ↔ Leaflet)
  - `googleMapsLoader.ts`: Centralized Google Maps API integration

- **Third-party Libraries**: 
  - Lodash for performance-optimized functions like `debounce` and `throttle`
  - Direct imports of specific functions (e.g., `import debounce from 'lodash/debounce'`) for optimized bundling

### Map Rendering
Leaflet as the mapping library provides:
- Lightweight and performant map rendering
- Support for custom layers and controls
- Extensive plugin ecosystem
- Mobile-friendly interactions

### API Design
The RESTful API follows these principles:
- Resource-oriented design
- Proper use of HTTP methods
- Nested resources where appropriate
- Consistent response formats

## Database Schema

The core database models include:

1. **User**: Extended Django user model with role information
2. **Note**: Geolocated notes with permission settings
3. **Shape**: Polygons and lines with associated metadata
4. **Media**: Photos and other media linked to geographic points
5. **Plan**: Route planning information

## Performance Considerations

- Spatial indexing for efficient geographic queries
- Appropriate caching strategies for map tiles
- Lazy loading of map features based on viewport
- Optimized media storage and delivery

## Security Implementation

- HTTPS for all communications
- JWT token expiration and refresh strategy
- CORS configuration for API access
- Input validation and sanitization
- Role-based access control to resources

## Deployment Strategy

### Development
- Local development environment with Django's development server
- Vue.js development server with hot reloading

### Staging
- Containerized deployment with Docker
- CI/CD pipeline for automated testing and deployment

### Production
- WSGI/ASGI server (Gunicorn/Uvicorn) behind Nginx
- PostgreSQL database with regular backups
- Static file serving through CDN
- Media storage with proper backup strategy

## Monitoring and Logging

- Application logging with rotating file handlers
- Database query logging for performance analysis
- Error tracking and reporting
- Performance monitoring

## Frontend : gestion avancée de l'interactivité Leaflet

### Sélection tolérante (Leaflet.AlmostOver)
- Utilisation du plugin Leaflet.AlmostOver pour améliorer la sélection des entités cartographiques (lignes, polygones, GeoNotes) avec une tolérance personnalisée.
- Correction des types TypeScript pour la compatibilité avec les événements AlmostOver.
- Gestion des survols, clics et sorties avec des effets visuels (surlignage, pulsation, curseur pointer).

### Robustesse de l'affichage des GeoNotes
- Ajout de méthodes `forceVisible()` et `recreateIcon()` dans la classe GeoNote pour garantir la visibilité de l'icône même en cas de bug d'affichage ou de disparition DOM.
- Vérification automatique de la taille de l'élément DOM après chaque interaction critique (survol, zoom, déplacement) et recréation de l'icône si nécessaire.
- Application de styles CSS globaux pour forcer la visibilité et la non-disparition des notes.

### Gestion des erreurs et logs
- Ajout de logs détaillés pour le debug (état du DOM, actions de recréation, etc.).
- Gestion robuste des erreurs lors de la manipulation du DOM (try/catch, fallback sur recréation d'icône).
- Ajout d'une logique de repli (`loadLastPlan`) dans `MapView.vue` : si le chargement d'un plan spécifié dans l'URL échoue (404), le composant tente de recharger automatiquement le **dernier plan consulté**, en conservant l'ID (`lastPlanId`) dans `localStorage`.
- Mise à jour des hooks de gestion d'erreur pour préserver `lastPlanId` lors des échecs initiaux et permettre le rechargement de secours.

## Règle de scroll pour les tabs de DrawingTools.vue (correctif final)

Pour garantir un scroll fiable dans tous les onglets (Outils, Style, Filtres) de DrawingTools.vue :

1. Structure flex correcte :
   - Le conteneur parent `.overflow-hidden.flex.flex-col` doit avoir `flex: 1; min-height: 0; height: 100%; overflow: hidden`
   - La barre d'onglets `.tabs-container` doit avoir `height: 40px; flex-shrink: 0` pour une taille fixe
   - Chaque tab `.tab-content` doit avoir `flex: 1; min-height: 0; overflow-y: auto`

2. Max-height responsive :
   - Sur mobile : `max-height: calc(100% - 50px); padding-bottom: 60px` pour éviter que le contenu soit masqué par la barre inférieure
   - Sur desktop : `max-height: calc(100% - 60px)` pour tenir compte de la barre d'onglets

3. Éviter les valeurs fixes en `vh` qui sont peu fiables sur mobile et préférer des valeurs relatives en pourcentage.

Cette approche permet un scroll fiable sur tous les appareils, sans dépendre de la taille de l'écran ou de l'interface.

## Gestion des dates de création et de modification des notes

Les entités Note disposent de deux champs de date principaux :
- **createdAt** : date de création de la note (fournie par le backend)
- **updatedAt** : date de dernière modification de la note (fournie par le backend)

**Règle : le frontend ne doit jamais écraser ces valeurs lors du chargement des notes depuis l'API.**

- Lors de l'ajout d'une note dans le store Pinia, si les champs `createdAt` ou `updatedAt` sont présents dans la donnée reçue du backend, ils sont utilisés tels quels.
- Si ces champs sont absents (cas d'une création locale temporaire), la date courante est utilisée en fallback.
- Lorsqu'une note est modifiée, seul le backend met à jour le champ `updatedAt`.
- L'affichage des dates dans l'UI reflète toujours la valeur réelle du backend, garantissant la cohérence des historiques de modification.

Cette règle évite que toutes les notes affichent la même date/heure après un rechargement de page et garantit la traçabilité des modifications.

### GeoNote API

Dans `api/views.py`, la classe `GeoNoteViewSet` centralise la logique des permissions dans la méthode `get_queryset` :

```python
    def get_queryset(self):
        """
        Filtre les GeoNotes selon le niveau d'accès :
        - private  : créateur uniquement
        - company  : entreprise uniquement
        - employee : entreprise & salariés
        - visitor  : toute l'entreprise
        Admin voit tout
        """
        user = self.request.user
        qs = GeoNote.objects.all()

        if user.role == ROLE_ADMIN:
            return qs

        entreprise_id = getattr(user, 'entreprise_id', None)
        private_q = Q(access_level='private', createur=user)
        company_q = Q(access_level='company', enterprise_id=entreprise_id)
        employee_q = Q(access_level='employee', enterprise_id=entreprise_id)
        visitor_q = Q(access_level='visitor', enterprise_id=entreprise_id)

        return qs.filter(private_q | company_q | employee_q | visitor_q)
```

Aussi, `perform_create` assigne désormais le champ `createur` automatiquement à `

## Mobile Editing Support (2024-06)

TagMap now supports full mobile editing for all map shapes (polygons, lines, GeoNotes):
- Control points are touch-friendly: you can drag, move, and edit shapes with your finger on mobile devices.
- Control points are larger on mobile for easier interaction.
- All drag/move logic is unified for mouse and touch events, ensuring a consistent experience across devices.
- Mobile UX best practices: only one control point can be dragged at a time, and the UI avoids accidental map pans during editing.
- Clicking on an existing shape when no drawing tool is active enters selection mode, allowing modification via control points.

### Technical Details
- All control point event handlers now listen to both mouse and touch events.
- A utility function normalizes event coordinates for both input types.
- This enables a Figma/Google Maps/Procreate-like editing experience on mobile.

## Update: Line Class Method Implementation (2024-06)

- The custom `Line` class in `frontend/tagmap/src/utils/Line.ts` now implements its key methods (such as `updateProperties`, `setName`, `getName`, `getMidPoints`, `getMidPointAt`, `moveVertex`, `getSegmentLengths`, `getSegmentLengthAt`, `getLength`, `getLengthToVertex`) as class properties using arrow functions. This change ensures compatibility with the base `L.Polyline` class from Leaflet, which defines these as instance properties, and resolves TypeScript linter errors about member type mismatches.
- This update is required for correct subclassing and to avoid runtime and type errors when extending Leaflet geometry classes in TypeScript.

## Nettoyage production : suppression des prints

Tous les appels à `print` ont été supprimés de `api/views.py` afin d'assurer un code propre pour la production et conforme au cahier des charges. Les logs de debug doivent être remplacés par un système de logging structuré si besoin de suivi en production.

# Matrice d'accès aux notes géolocalisées (GeoNote)

| Rôle         | private (privé) | company (entreprise) | employee (salariés) | visitor (visiteurs) |
|--------------|-----------------|----------------------|---------------------|---------------------|
| **Admin**    | ✅              | ✅                   | ✅                  | ✅                  |
| **Entreprise**| ✅ (créateur)   | ✅                   | ✅                  | ✅                  |
| **Salarié**  | ✅ (créateur)   |                      | ✅                  | ✅                  |
| **Visiteur** | ✅ (créateur)   |                      |                     | ✅                  |

- L'admin voit toutes les notes sans restriction.
- L'entreprise voit toutes les notes liées à son entreprise.
- Le salarié voit ses notes privées, celles de type employee et visitor.
- Le visiteur voit ses notes privées et celles de type visitor.

Cette matrice est appliquée dans `GeoNoteViewSet.get_queryset` (backend).

## Règle de mise à jour du champ updatedAt pour les notes géolocalisées (GeoNote)

Depuis 2024-06, la logique de mise à jour du champ `updatedAt` (date de modification) des notes géolocalisées (GeoNote) a été renforcée côté backend :

- Le champ `updatedAt` n'est mis à jour que si au moins un des champs suivants change : `title`, `description`, `access_level`, `style`, `column`, `location`, `order`, `category`.
- Si une requête PATCH/PUT ne modifie aucun de ces champs (valeurs identiques à l'existant), la date `updatedAt` reste inchangée.
- Cela évite les faux historiques de modification lors de sauvegardes ou synchronisations sans modification réelle.
- Cette règle est testée automatiquement (voir tasks/).

**Impact :**
- L'historique des modifications est fiable et reflète uniquement les vraies modifications de contenu.
- Les utilisateurs voient la date de dernière modification uniquement si la note a réellement changé.

Voir aussi : `GeoNoteSerializer.update()` dans `api/serializers.py`.

## [2024-06-10] Ajout de la méthode openInGoogleMaps à GeoNote

Une méthode openInGoogleMaps() a été ajoutée à la classe GeoNote (frontend/tagmap/src/utils/GeoNote.ts). Elle permet d'ouvrir un itinéraire Google Maps vers la position de la note sélectionnée. Cette méthode est appelée depuis DrawingTools.vue lorsque l'utilisateur clique sur le bouton "Itinéraire" d'une note géolocalisée.

- Récupère la position de la note via getLatLng()
- Construit l'URL Google Maps pour l'itinéraire
- Ouvre l'URL dans un nouvel onglet
- Affiche une notification si la position est invalide

Usage :
- Utilisé dans DrawingTools.vue, méthode openGeoNoteRoute()
- Permet à l'utilisateur d'obtenir rapidement un itinéraire vers une note depuis l'interface cartographique

# Gestion centralisée des niveaux d'accès

- Les niveaux d'accès sont définis par l'enum `NoteAccessLevel` (`private`, `company`, `employee`, `visitor`) dans `src/types/notes.ts`.
- Le mapping `ACCESS_LEVELS` (dans `src/utils/noteHelpers.ts`) fournit les labels et descriptions à utiliser dans tous les composants Vue (DrawingTools, NoteEditModal, NotesView, etc.).
- Pour garantir la cohérence, tout `<select>` ou filtre d'accès doit utiliser ce mapping.
- Le filtre de la carte (onglet Filtres de DrawingTools) n'affiche pas l'option "Privé" (éléments strictement personnels).
- Les valeurs de filtre et de propriété sont toujours du type NoteAccessLevel (string enum).
- Pour ajouter un nouveau niveau d'accès, il faut :
  1. Ajouter la valeur dans l'enum NoteAccessLevel.
  2. Ajouter l'entrée correspondante dans ACCESS_LEVELS.
  3. Vérifier les usages dans tous les composants et stores.

**Exemple d'utilisation dans un select :**
```vue
<select v-model="accessLevel">
  <option v-for="level in ACCESS_LEVELS" :key="level.id" :value="level.id">
    {{ level.title }} - {{ level.description }}
  </option>
</select>
```

**Exemple pour le filtre (sans 'private') :**
```vue
<option v-for="level in ACCESS_LEVELS.filter(l => l.id !== NoteAccessLevel.PRIVATE)" :key="level.id" :value="level.id">
  {{ level.title }}
</option>
```

## Map Base Layers Configuration

TagMap utilise plusieurs fonds de carte (base layers) pour la visualisation géospatiale :

- **Hybride (Google Maps)** : via un proxy backend `/api/tiles/hybrid/{z}/{x}/{y}.png` qui utilise l'API officielle Google Maps Map Tiles. Le backend :
  1. Récupère la clé API Google Maps côté serveur (jamais exposée au client)
  2. Effectue un POST vers `https://tile.googleapis.com/v1/createSession` pour obtenir un jeton de session (session token) avec:
     - `mapType`: "satellite" (image satellite de base)
     - `layerTypes`: ["layerRoadmap"] (superposition des labels de routes)
  3. Utilise ce jeton pour requêter la tuile hybride (satellite + labels) via `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=...`
  4. Retourne la tuile au frontend avec les headers de cache appropriés
  5. Gère les erreurs et logs structurés côté serveur

  Ce flux garantit la confidentialité de la clé API, le respect des quotas, et la conformité avec la documentation Google ([voir doc officielle](https://developers.google.com/maps/documentation/tile/satellite?hl=fr)). 
  
  La même configuration est utilisée à la fois pour les composants Leaflet et MapLibre GL, garantissant une expérience utilisateur cohérente quelle que soit la bibliothèque cartographique utilisée.

- **Cadastre (Parcellaire Express)** : fond Google Maps hybride (satellite + labels) avec superposition cadastrale (Géoportail IGN) :
  - Satellite + labels : `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`
  - Superposition cadastrale : `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`
- **IGN (Plan IGN V2)** : via le service public Géoportail IGN :
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

**Important :**
- Toute modification future du flux d'obtention des tuiles hybrides Google Maps doit être synchronisée dans la documentation et les tests automatisés.
- Les options d'attribution, de zoom maximal (`maxzoom`), et de taille de tuile (`tileSize`) doivent rester cohérentes entre tous les composants utilisant ces fonds de carte (voir `useMapState.ts` et `MapLibreTest.vue`).
- Les URLs IGN historiques de type `wxs.ign.fr` ou nécessitant une clé API ne sont plus supportées pour les couches publiques. Toujours utiliser les endpoints `data.geopf.fr` pour garantir la disponibilité sans authentification.

**Important :**
- Toute modification future du flux d'obtention des tuiles hybrides Google Maps doit être synchronisée dans la documentation et les tests automatisés.
## MapLibre Tile Handling

Toutes les requêtes de tuiles cartographiques (hybride, cadastre, IGN) passent par l'API backend `/api/tiles/{type}/{z}/{x}/{y}.png` pour :

1. Authentifier chaque requête avec le token utilisateur
2. Logger et monitorer l'usage
3. Appliquer les quotas côté serveur
4. Protéger les clés API externes

Le frontend utilise la fonction `mapService.getTransformRequest()` pour injecter automatiquement les headers d'authentification dans les requêtes de tuiles. Ce mécanisme garantit que seules les requêtes authentifiées accèdent aux tuiles premium et que la sécurité est maximale.

## Known Issues

- [2024-07-19] Vue warning: Property "deleteSelectedFeature" was accessed during render but is not defined; resolved by renaming the `@delete-shape` binding to `handleDrawDelete` in `MapLibreTest.vue`.
- [2024-07-20] MapLibre-Geoman errors "Can't add controls: controls already added" and "An image named \"default-marker\" already exists"; resolved by using `.once` for the `load` and `gm:loaded` events and monkey-patching `addImage` to guard against duplicate images.

## [2024-06] Mise à jour PWA/mobile

- La balise `<meta name="apple-mobile-web-app-capable" content="yes">` est désormais dépréciée et doit être remplacée par `<meta name="mobile-web-app-capable" content="yes">` dans le fichier HTML principal.
- Toutes les icônes référencées dans le manifest (ex: `/static/frontend/img/icons/msapplication-icon-144x144.png`) doivent exister et être des images PNG valides. Vérifier leur présence dans le dossier `frontend/tagmap/public/img/icons/`.
- Voir aussi le manifest à l'emplacement `static/frontend/manifest.webmanifest` pour la liste complète des icônes attendues.
- Les chemins d'icônes dans le manifest doivent être relatifs à la racine publique (ex: `/img/icons/msapplication-icon-144x144.png`) pour garantir la compatibilité avec le serveur de développement Vite et le mode PWA.