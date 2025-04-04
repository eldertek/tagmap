from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    elevation_proxy
)

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

urlpatterns = [
    path('', include(router.urls)),
    path('elevation/', elevation_proxy, name='elevation-proxy'),
]
