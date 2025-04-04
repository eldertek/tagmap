from django.core.exceptions import PermissionDenied
from django.db.models import Q
from rest_framework import viewsets, permissions
from api.models import GeoNote, NoteColumn

class GeoNoteViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des notes géolocalisées."""
    serializer_class = GeoNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Ne retourne que les notes des plans accessibles à l'utilisateur
        """
        user = self.request.user
        if user.role == ROLE_ADMIN:
            return GeoNote.objects.all()
        elif user.role == ROLE_USINE:
            # Une entreprise peut voir les notes où elle est assignée directement
            # ou liées à ses salaries et leurs visiteurs
            return GeoNote.objects.filter(
                Q(plan__entreprise=user) |
                Q(plan__salarie__entreprise=user) |
                Q(plan__visiteur__salarie__entreprise=user)
            )
        elif user.role == ROLE_DEALER:
            # Un salarie peut voir ses notes et celles de ses visiteurs
            return GeoNote.objects.filter(
                Q(plan__salarie=user) |
                Q(plan__visiteur__salarie=user)
            )
        else:  # visiteur
            return GeoNote.objects.filter(plan__visiteur=user)

    def perform_create(self, serializer):
        """
        Vérifie que l'utilisateur a le droit de créer une note sur ce plan
        et assigne la colonne par défaut à la note
        """
        plan = serializer.validated_data['plan']
        user = self.request.user

        # Vérifier les permissions
        if plan.createur != user and user.role not in [ROLE_ADMIN, ROLE_DEALER]:
            raise PermissionDenied('Vous n\'avez pas la permission de modifier ce plan')

        # Récupérer la colonne par défaut
        default_column = None
        try:
            default_column = NoteColumn.objects.filter(is_default=True).first()
            if not default_column:
                # S'il n'y a pas de colonne par défaut, prendre la première
                default_column = NoteColumn.objects.order_by('order').first()
                
            print(f"[GeoNoteViewSet][perform_create] Colonne par défaut trouvée: {default_column.id if default_column else 'aucune'}")
        except Exception as e:
            print(f"[GeoNoteViewSet][perform_create] Erreur lors de la récupération de la colonne par défaut: {str(e)}")
            
        # Si une colonne par défaut existe, l'assigner à la note
        if default_column and 'column' not in serializer.validated_data:
            print(f"[GeoNoteViewSet][perform_create] Assignation de la colonne par défaut {default_column.id} à la note")
            serializer.save(column=default_column)
        else:
            print(f"[GeoNoteViewSet][perform_create] Pas de colonne assignée à la note")
            serializer.save() 