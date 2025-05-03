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