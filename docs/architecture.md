# TagMap System Architecture

## System Overview

TagMap is a web-based application built using a modern client-server architecture, with a clear separation between frontend and backend components. The system is designed to handle geospatial data visualization, annotation, and collaborative features with role-based access control.

```mermaid
flowchart TD
    subgraph Client
        FE[Vue.js Frontend]
        Map[Leaflet Map Component]
        Auth[Authentication Module]
        Notes[Notes Management]
        Drawing[Drawing Tools]
        Media[Media Management]
        Routes[Route Planning]
        PDF[PDF Generation]
    end

    subgraph Backend
        API[Django REST API]
        GIS[GeoSpatial Processing]
        Auth_BE[Authentication Service]
        DB[(PostgreSQL/PostGIS)]
        Media_Store[Media Storage]
    end

    FE --> API
    Map --> GIS
    Auth --> Auth_BE
    Auth_BE --> DB
    Notes --> API
    Drawing --> GIS
    GIS --> DB
    Media --> Media_Store
    Routes --> API
    PDF --> API
    API --> DB
```

## Component Architecture

### Frontend Components

1. **Vue.js Frontend**
   - Main application shell
   - Responsive design for both desktop and mobile
   - State management with Vuex/Pinia

2. **Leaflet Map Component**
   - Map rendering with multiple layer support
   - Custom controls for layer switching
   - Event handling for map interactions

3. **Authentication Module**
   - Login/logout functionality
   - Role-based interface adaptation
   - Permission checks

4. **Notes Management**
   - Creation and editing of geolocated notes
   - Permission management for notes
   - Filtering and searching

5. **Drawing Tools**
   - Polygon creation with area calculation
   - Line drawing with altimetric profiling
   - Shape persistence and editing
   - Note tool icon updated to map pin SVG for better geolocation representation
   - Enhanced location pin with circle underneath to represent drop shadow
   - Improved visibility of the drop shadow with larger dimensions and subtle fill

6. **Media Management**
   - Photo capture interface
   - Media attachment to geographic points
   - Quota management

7. **Route Planning**
   - Route calculation interface
   - Integration with external mapping services

8. **PDF Generation**
   - Client-side report generation
   - Selection of points for inclusion
   - PDF formatting

### Backend Components

1. **Django REST API**
   - RESTful endpoints for all application features
   - JWT-based authentication
   - Cross-origin resource sharing configuration

2. **GeoSpatial Processing**
   - Handling of geographic data formats
   - Spatial calculations (distances, areas)
   - Altimetric profile generation

3. **Authentication Service**
   - User management
   - Role assignment
   - Permission validation

4. **PostgreSQL/PostGIS Database**
   - Relational data storage
   - Geospatial data types and functions
   - Performance optimization for spatial queries

5. **Media Storage**
   - File management and storage
   - Quota enforcement
   - Media optimization

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Authenticate
    Frontend->>API: Send credentials
    API->>Database: Validate user
    Database-->>API: User data with role
    API-->>Frontend: Authentication token
    Frontend-->>User: Authenticated session
    
    User->>Frontend: View map with layers
    Frontend->>API: Request map data
    API->>Database: Query geospatial data
    Database-->>API: Return filtered data
    API-->>Frontend: Map data with permissions
    Frontend-->>User: Render map with layers
    
    User->>Frontend: Create geolocated note
    Frontend->>API: Send note data
    API->>Database: Store note with permissions
    Database-->>API: Confirmation
    API-->>Frontend: Success response
    Frontend-->>User: Update UI with new note
    
    User->>Frontend: Generate PDF report
    Frontend->>API: Request data for report
    API->>Database: Query selected points
    Database-->>API: Return point data
    API-->>Frontend: Data for report
    Frontend-->>User: Download PDF report
```

## Security Architecture

```mermaid
flowchart TD
    Auth[Authentication]
    JWT[JWT Token]
    Role[Role Validation]
    Perm[Permission Check]
    Data[Data Access]
    
    Auth --> JWT
    JWT --> Role
    Role --> Perm
    Perm --> Data
    
    subgraph "Access Levels"
        Admin[Administrator]
        Company[Company]
        Employee[Employee]
        Visitor[Visitor]
    end
    
    Admin -.-> Perm
    Company -.-> Perm
    Employee -.-> Perm
    Visitor -.-> Perm
```

## Technology Stack

### Frontend
- **Framework**: Vue.js
- **Map Library**: Leaflet
- **State Management**: Vuex or Pinia
- **Build Tools**: Vite
- **UI Components**: Custom components with responsive design

### Backend
- **Framework**: Django with Django REST Framework
- **Geospatial**: GeoDjango and PostGIS
- **Authentication**: JWT-based authentication
- **Database**: PostgreSQL with PostGIS extension
- **API Documentation**: Swagger/OpenAPI

### Deployment
- **Frontend**: Static file hosting (Nginx)
- **Backend**: WSGI/ASGI server (Gunicorn/Uvicorn)
- **Database**: PostgreSQL server
- **Media Storage**: File system with proper backup strategy

## Current Workflow Implementation Status

The current implementation status of the system workflows is as follows:

| Workflow | Status | Notes |
|----------|--------|-------|
| User Authentication | To be implemented | Basic structure set up |
| Map Visualization | To be implemented | |
| Note Creation | To be implemented | |
| Drawing Tools | To be implemented | |
| Media Management | To be implemented | |
| Route Planning | To be implemented | |
| PDF Generation | To be implemented | |
| API Integrations | Future work | | 