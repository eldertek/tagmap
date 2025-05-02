# TagMap Active Development Context

## Current Work Focus

The project is currently in the initialization phase. Documentation is being set up to establish a clear understanding of the project requirements, architecture, and development roadmap before beginning active development.

### Recent Activities
- Created project directory structure
- Established documentation framework
- Defined overall system architecture
- Outlined technical stack and requirements
- Developed detailed task breakdown
- Implemented Google Maps integration for Hybrid view

### Active Decisions

1. **Technology Stack Selection**
   - Backend: Django + GeoDjango + PostGIS for powerful geospatial capabilities
   - Frontend: Vue.js + Leaflet for interactive map features
   - Authentication: JWT-based system with role-based permissions
   - Database: PostgreSQL with PostGIS extension for spatial data
   - Map Services: Google Maps API for high-quality hybrid satellite view

2. **Architecture Approach**
   - Client-server architecture with clear separation of concerns
   - RESTful API design following resource-oriented principles
   - Component-based frontend with responsive design
   - Role-based security model aligned with business requirements

3. **Development Methodology**
   - Phased development approach, starting with core foundations
   - Feature-based task organization
   - Test-driven development for critical components
   - Documentation-first approach to ensure clarity and alignment

## Current Challenges

1. **Database Schema Design**
   - Defining optimal structure for geospatial data
   - Implementing efficient relationships between entities
   - Planning for scalability and performance

2. **Role-Based Access Control**
   - Implementing the hierarchical permission system
   - Ensuring proper filtering of data based on user roles
   - Maintaining security throughout the application

3. **Map Layer Integration**
   - ✅ Implemented Google Maps for high-quality hybrid view
   - Ensuring efficient layer switching and rendering
   - Ensuring cross-platform compatibility
   - Managing Google Maps API usage and quotas

## Recent Changes
- Updated DrawingTools.vue to use map pin icon for Note tool
- Improved Note icon with an additional circle underneath to better represent location drop pin
- Enhanced the visibility of the drop pin circle by increasing its size and adding slight fill
- Integrated Google Maps via leaflet.gridlayer.googlemutant for improved hybrid satellite/labels view
- Implemented dynamic Google Maps API loading for better performance
- Created configuration system for map services with API key management
- Integrated Leaflet.AlmostOver plugin to improve line selection with a tolerance area around lines
- Enhanced line interaction with visual feedback on hover when mouse is near a line
- Added automatic line detection to make it easier to select lines on the map
- Amélioration de la fonction AlmostOver : possibilité de survoler et sélectionner d'autres formes même lorsqu'une forme est déjà sélectionnée, ce qui permet une navigation plus fluide entre les différentes entités de la carte.

## Next Actions

1. **Immediate Tasks (Next 1-2 Days)**
   - Complete documentation setup
   - Initialize Django project structure
   - Configure PostgreSQL with PostGIS
   - Set up initial Vue.js frontend
   - Add documentation about Google Maps API key configuration for developers

2. **Short-Term Goals (Next Week)**
   - Implement database models
   - Create basic authentication system
   - Set up map integration with base layers
   - Test Google Maps integration across different devices/browsers

3. **Current Sprint Focus**
   - Establish foundation components (Phase 1 from task plan)
   - Create development environment setup documentation
   - Implement initial database schema
   - Finalize map layers integration with proper documentation

4. **Current Code Updates**
   - Replace Note icon in DrawingTools.vue with map pin SVG
   - Improve visibility of the location pin drop effect with better styling
   - Configure Google Maps integration for high-quality satellite view with labels

## Blockers and Dependencies

- Need to monitor Google Maps API usage and potentially establish quotas
- Need to communicate with team about obtaining and managing Google API key securely

## Notes and Considerations

- Consider leveraging existing libraries for map features to accelerate development
- Research best practices for handling large geospatial datasets
- Investigate optimal media storage solutions for the application
- Plan for cross-browser and cross-device testing early
- Consider internationalization requirements from the beginning 
- Implement proper error handling for map services in case of API failures or quota limits
- Create a backup plan for map layers if Google Maps API becomes unavailable 