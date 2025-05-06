from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (
    SalarieViewSet,
    ClientViewSet,
    PlanViewSet,
    FormeGeometriqueViewSet,
    ConnexionViewSet,
    TexteAnnotationViewSet,
    GeoNoteViewSet,
    NoteCommentViewSet,
    NotePhotoViewSet,
    NoteColumnViewSet,
    MapFilterViewSet,
    WeatherViewSet,
    hybrid_tile_proxy,
    ApplicationSettingViewSet,
)

# Router principal
router = DefaultRouter()
router.register(r'users/salaries', SalarieViewSet, basename='salarie')
router.register(r'users/clients', ClientViewSet, basename='client')
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'formes', FormeGeometriqueViewSet, basename='forme')
router.register(r'connexions', ConnexionViewSet, basename='connexion')
router.register(r'annotations', TexteAnnotationViewSet, basename='annotation')
router.register(r'notes', GeoNoteViewSet, basename='note')
router.register(r'note-comments', NoteCommentViewSet, basename='note-comment')
router.register(r'note-photos', NotePhotoViewSet, basename='note-photo')
router.register(r'columns', NoteColumnViewSet, basename='column')
router.register(r'map-filters', MapFilterViewSet, basename='map-filters')
router.register(r'settings', ApplicationSettingViewSet, basename='settings')

# Routes pour l'API météo (séparer les endpoints)
router.register(r'weather', WeatherViewSet, basename='weather')

# Nested routes for notes
notes_router = NestedDefaultRouter(router, r'notes', lookup='note')
notes_router.register(r'comments', NoteCommentViewSet, basename='note-comments')
notes_router.register(r'photos', NotePhotoViewSet, basename='note-photos')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(notes_router.urls)),  # Include nested routes
    # Proxy pour les tuiles Google Maps Hybrid
    path('tiles/hybrid/<int:z>/<int:x>/<int:y>.png', hybrid_tile_proxy, name='hybrid-tile-proxy'),
]
