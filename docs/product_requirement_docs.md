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

### Geospatial Annotation Features
- Creation of geolocated notes with customizable permissions
- Drawing tools for creating polygons with automatic area calculation
- Line drawing with altimetric profile generation
- Side panel dialog box interface for note management

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

## 5. Future Considerations
- Enhanced filtering capabilities
- Additional map visualization options
- Expanded API integration options
- Advanced reporting and analytics features 