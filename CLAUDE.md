# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands
- Backend: `python manage.py runserver --insecure`
- Frontend: `cd frontend/tagmap && npm run dev`
- Dev mode (both): `make dev`
- Build frontend: `cd frontend/tagmap && npm run build-only -- --mode production`
- Lint backend: `make lint` (flake8 & black)
- Lint frontend: `cd frontend/tagmap && npm run lint`
- Typecheck frontend: `cd frontend/tagmap && npm run type-check`
- Tests: `make test` (all) or `python manage.py test <app_name>.<test_module>`

## Code Style Guidelines
- **Python**: Follow Black formatting, use type hints, organize imports (standard, third-party, local)
- **TypeScript/Vue**: Use Composition API, strict typing with TypeScript, descriptive variable names
- **Error Handling**: Always use try/catch blocks and provide meaningful error messages
- **Maps**: Properly clean up Leaflet instances to prevent memory leaks
- **API**: RESTful design with proper HTTP methods and nested resources when appropriate
- **Documentation**: Update docs/ when implementing new features
- **Components**: Follow single-responsibility principle, document props with types

## Project Notes
- Django backend with GeoDjango for mapping features
- Vue 3 + TypeScript frontend
- Map implementation uses Leaflet with performance optimizations
- JWT authentication with role-based access control