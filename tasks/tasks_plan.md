# TagMap Tasks Plan

## Project Progress Tracking

### Overall Progress
- Project initialization: Completed
- Documentation setup: In progress
- Development: Not started

## Development Status

| Component | Status | Priority | Assignee | Notes |
|-----------|--------|----------|----------|-------|
| Project Setup | Not started | High | - | Initial Django and Vue.js project setup |
| Database Models | Not started | High | - | Define core models for the application |
| Authentication System | Not started | High | - | Implement role-based authentication |
| Base Map Integration | Not started | High | - | Integrate Leaflet with base map layers |
| Geolocation Notes | Not started | Medium | - | Create and manage geolocated notes |
| Drawing Tools | Not started | Medium | - | Implement polygon and line drawing tools |
| Media Management | Not started | Medium | - | Photo capture and attachment to points |
| Route Planning | Not started | Low | - | Calculate and display routes |
| PDF Generation | Not started | Low | - | Generate reports from map data |
| Frontend UI | Not started | Medium | - | Design and implement responsive UI |
| Deployment | Not started | Low | - | Setup production deployment |

## Task Breakdown

### Phase 1: Foundation (Priority: High)

1. **Project Setup**
   - [x] Initialize project documentation
   - [ ] Set up Django project structure
   - [ ] Configure PostgreSQL with PostGIS
   - [ ] Initialize Vue.js frontend project
   - [ ] Configure development environment

2. **Database Models**
   - [ ] Design database schema
   - [ ] Implement User model with roles
   - [ ] Implement Note model
   - [ ] Implement Shape model
   - [ ] Implement Media model
   - [ ] Implement Plan model
   - [ ] Create database migrations
   - [ ] Write model unit tests

3. **Authentication System**
   - [ ] Implement backend authentication
   - [ ] Create JWT token system
   - [ ] Implement permission classes
   - [ ] Create frontend authentication components
   - [ ] Implement role-based access control
   - [ ] Write authentication tests

4. **Base Map Integration**
   - [ ] Set up Leaflet map component
   - [ ] Integrate hybrid map layer
   - [ ] Integrate cadastral map layer
   - [ ] Integrate IGN map layer
   - [ ] Implement layer switching UI
   - [ ] Create map controls
   - [ ] Test map rendering on different devices
   - [x] Intégrer Leaflet.AlmostOver pour la sélection tolérante des lignes, polygones et GeoNotes (tolérance 25px, gestion des événements almost:over, almost:out, almost:click)
   - [x] Ajouter forceVisible() et recreateIcon() à GeoNote pour garantir la visibilité même en cas de bug d'affichage
   - [x] Corriger les types TypeScript pour la compatibilité avec les événements AlmostOver
   - [x] Appliquer des styles CSS globaux pour forcer la visibilité des notes
   - [x] Ajouter une gestion robuste des erreurs et des logs détaillés pour le debug frontend
   - [x] Correction UI : scroll fiable dans tous les tabs de DrawingTools.vue avec architecture flex optimisée (parent flex avec height: 100%, barre d'onglets hauteur fixe, .tab-content avec flex: 1 et max-height en pourcentage, padding-bottom adapté sur mobile). Documentation technique mise à jour.

### Phase 2: Core Features (Priority: Medium)

5. **Geolocation Notes**
   - [ ] Create note creation interface
   - [ ] Implement permission settings for notes
   - [ ] Create note viewing interface
   - [ ] Implement note filtering
   - [ ] Create side panel dialog box
   - [ ] Connect notes to backend API
   - [ ] Write note feature tests
   - [ ] **Test : Vérifier que les dates de modification (`updatedAt`) des notes ne changent que lors d'une modification réelle et restent cohérentes après rechargement de la page.**

6. **Drawing Tools**
   - [ ] Implement polygon drawing
   - [ ] Add area calculation for polygons
   - [ ] Implement line drawing
   - [ ] Add altimetric profile generation
   - [ ] Create shape editing tools
   - [ ] Connect shapes to backend API
   - [ ] Write drawing tools tests
   - [x] Replace Note tool icon with map pin SVG in DrawingTools.vue
   - [x] Improve Note icon with circle underneath to better represent location drop pin
   - [x] Enhance visibility of the location pin drop shadow with larger size and fill

7. **Media Management**
   - [ ] Create photo capture interface
   - [ ] Implement media attachment to points
   - [ ] Set up quota management
   - [ ] Configure media optimization
   - [ ] Create media viewing interface
   - [ ] Connect media to backend API
   - [ ] Write media management tests

8. **Frontend UI**
   - [ ] Design responsive layout
   - [ ] Implement navigation components
   - [ ] Create mobile-friendly controls
   - [ ] Design and implement filtering UI
   - [ ] Create unified styling system
   - [ ] Test UI on various screen sizes

### Phase 3: Additional Features (Priority: Low)

9. **Route Planning**
   - [ ] Implement route calculation
   - [ ] Create route display on map
   - [ ] Integrate with external mapping services
   - [ ] Add route saving functionality
   - [ ] Write route planning tests

10. **PDF Generation**
    - [ ] Create report template design
    - [ ] Implement point selection for reports
    - [ ] Generate PDF from selected points
    - [ ] Add download functionality
    - [ ] Write PDF generation tests

11. **Deployment**
    - [ ] Configure production settings
    - [ ] Set up static file serving
    - [ ] Configure database for production
    - [ ] Set up media storage
    - [ ] Create deployment documentation
    - [ ] Implement monitoring and logging

## Known Issues

No issues have been identified yet as development has not started.

## Next Steps

1. Complete initial project setup
2. Implement database models
3. Create basic authentication system
4. Set up map integration with base layers
5. Begin work on the core geolocation note features 