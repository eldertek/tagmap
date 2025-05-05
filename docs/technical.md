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
- **State Management**: Vuex or Pinia
- **HTTP Client**: Axios
- **CSS Framework**: Custom styling with responsive design
- **Auto-Save Feature**: Frontend now automatically triggers plan save every minute and upon any drawing modification (creation, deletion, update).
- **Les salariés peuvent voir et charger les plans sans visiteur associé, via un bouton dédié dans MapView.vue (cohérence UX avec les entreprises).**

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