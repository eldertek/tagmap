"""
Module de vues pour l'API TagMap.
Gère les endpoints REST pour les utilisateurs, plans, notes et autres ressources.
"""

# Imports Django
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404, render

# Imports DRF
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

# Imports tiers
import requests

# Imports locaux
from .permissions import IsAdmin, IsSalarie, IsEntreprise
from .serializers import (
    UserSerializer, SalarieSerializer, ClientSerializer,
    PlanSerializer, FormeGeometriqueSerializer, ConnexionSerializer,
    TexteAnnotationSerializer, PlanDetailSerializer, GeoNoteSerializer,
    NoteCommentSerializer, NotePhotoSerializer, NoteColumnSerializer
)
from plans.models import (
    Plan, FormeGeometrique, Connexion, TexteAnnotation,
    GeoNote, NoteComment, NotePhoto
)

# Configuration
User = get_user_model()

# Constantes
ROLE_ADMIN = 'ADMIN'
ROLE_USINE = 'ENTREPRISE'
ROLE_DEALER = 'SALARIE'
ROLE_AGRICULTEUR = 'VISITEUR'

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des utilisateurs."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtre les utilisateurs selon:
        - Admin : tous les utilisateurs ou filtrés par rôle/entreprise/salarie
        - Entreprise : ses salaries et leurs visiteurs
        - Salarie : ses visiteurs
        - Visiteur : lui-même
        """
        user = self.request.user
        base_queryset = User.objects.annotate(plans_count=Count('plans'))

        # Récupérer les paramètres de filtrage
        role = self.request.query_params.get('role')
        entreprise_id = self.request.query_params.get('entreprise')
        salarie_id = self.request.query_params.get('salarie')

        print(f"\n[UserViewSet][get_queryset] ====== DÉBUT REQUÊTE ======")
        print(f"Utilisateur connecté: {user.username} (role: {user.role}, id: {user.id})")
        print(f"Paramètres reçus:")
        print(f"- role demandé: {role}")
        print(f"- entreprise_id: {entreprise_id}")
        print(f"- salarie_id: {salarie_id}")

        # Appliquer les filtres de base selon le rôle demandé
        if role:
            print(f"\nApplication du filtre de rôle: {role}")
            base_queryset = base_queryset.filter(role=role)
            print(f"Nombre d'utilisateurs après filtre de rôle: {base_queryset.count()}")

        # Filtrer selon le rôle de l'utilisateur connecté
        if user.role == ROLE_ADMIN:
            print("\nTraitement pour ADMIN")
            if entreprise_id:
                if role == ROLE_DEALER:
                    print(f"Filtrage des salaries pour l'entreprise {entreprise_id}")
                    base_queryset = base_queryset.filter(entreprise_id=entreprise_id)
                elif role == ROLE_AGRICULTEUR:
                    print(f"Filtrage des visiteurs pour l'entreprise {entreprise_id}")
                    base_queryset = base_queryset.filter(salarie__entreprise_id=entreprise_id)
            if salarie_id:
                print(f"Filtrage par salarie: {salarie_id}")
                base_queryset = base_queryset.filter(salarie_id=salarie_id)

        elif user.role == ROLE_USINE:
            print("\nTraitement pour ENTREPRISE")
            if role == ROLE_DEALER:
                print("Filtrage des salaries de l'entreprise")
                base_queryset = base_queryset.filter(entreprise=user)
            elif role == ROLE_AGRICULTEUR:
                print("Filtrage des visiteurs de l'entreprise")
                base_queryset = base_queryset.filter(salarie__entreprise=user)
                if salarie_id:
                    print(f"Filtrage supplémentaire par salarie: {salarie_id}")
                    base_queryset = base_queryset.filter(salarie_id=salarie_id)

                # Debug des visiteurs trouvés
                visiteurs = base_queryset.values('id', 'username', 'first_name', 'last_name', 'salarie__username')
                print("\nVisiteurs trouvés:")
                for agri in visiteurs:
                    print(f"- {agri['username']} (ID: {agri['id']}, Salarie: {agri['salarie__username']})")

        elif user.role == ROLE_DEALER:
            print("\nTraitement pour SALARIE")
            if role == ROLE_AGRICULTEUR:
                print("Filtrage des visiteurs du salarie")
                base_queryset = base_queryset.filter(salarie=user)
            else:
                base_queryset = base_queryset.filter(id=user.id)

        else:  # ROLE_AGRICULTEUR
            print("\nTraitement pour VISITEUR")
            base_queryset = base_queryset.filter(id=user.id)

        print(f"\nRequête SQL finale: {base_queryset.query}")
        result = base_queryset.distinct()
        print(f"Nombre total de résultats: {result.count()}")
        print("[UserViewSet][get_queryset] ====== FIN REQUÊTE ======\n")
        return result

    def get_permissions(self):
        if self.action == 'create':
            self.permission_classes = [permissions.IsAuthenticated, IsAdmin | IsEntreprise | IsSalarie]
        elif self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAuthenticated, IsAdmin | IsEntreprise | IsSalarie]
        return super().get_permissions()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        partial = kwargs.pop('partial', False)

        # Vérifier si username/email existe déjà pour un autre utilisateur
        username = request.data.get('username')
        email = request.data.get('email')

        if username and User.objects.exclude(id=instance.id).filter(username=username).exists():
            return Response(
                {'username': ['Un utilisateur avec ce nom existe déjà']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if email and User.objects.exclude(id=instance.id).filter(email=email).exists():
            return Response(
                {'email': ['Un utilisateur avec cet email existe déjà']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ne pas modifier le salarie pour un salarie
        if instance.role == ROLE_DEALER:
            if 'salarie' in request.data:
                del request.data['salarie']

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Vérifier si username/email existe déjà
        username = request.data.get('username')
        email = request.data.get('email')

        if User.objects.filter(username=username).exists():
            return Response(
                {'username': ['Un utilisateur avec ce nom existe déjà.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'email': ['Un utilisateur avec cet email existe déjà.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        data = serializer.validated_data
        instance = serializer.instance

        # Empêcher la modification du rôle sauf pour les admins
        if 'role' in data and not self.request.user.is_admin:
            raise ValidationError({
                'role': ['Seul un administrateur peut modifier le rôle']
            })

        serializer.save()

    def perform_create(self, serializer):
        """
        Lors de la création d'un plan:
        - Le créateur est toujours l'utilisateur courant
        - Vérifie l'existence et la validité des relations entreprise/salarie/visiteur
        - Pour un salarie, vérifie que l'visiteur lui appartient
        - Pour un visiteur, il est automatiquement assigné comme visiteur
        """
        user = self.request.user
        data = {}

        # Validation des relations
        entreprise = serializer.validated_data.get('entreprise')
        salarie = serializer.validated_data.get('salarie')
        visiteur = serializer.validated_data.get('visiteur')

        print(f"[PlanViewSet] perform_create - Données validées: {serializer.validated_data}")

        # Vérifier l'existence de l'entreprise
        if entreprise:
            if entreprise.role != ROLE_USINE:
                raise ValidationError({'entreprise': 'L\'utilisateur sélectionné n\'est pas une entreprise'})

        # Vérifier l'existence du salarie
        if salarie:
            if salarie.role != ROLE_DEALER:
                raise ValidationError({'salarie': 'L\'utilisateur sélectionné n\'est pas un salarie'})
            # Vérifier que le salarie appartient à l'entreprise
            if entreprise and salarie.entreprise != entreprise:
                raise ValidationError({'salarie': 'Ce salarie n\'appartient pas à l\'entreprise sélectionnée'})

        # Vérifier l'existence de l'visiteur
        if visiteur:
            if visiteur.role != ROLE_AGRICULTEUR:
                raise ValidationError({'visiteur': 'L\'utilisateur sélectionné n\'est pas un visiteur'})
            # Vérifier que l'visiteur appartient au salarie
            if salarie and visiteur.salarie != salarie:
                raise ValidationError({'visiteur': 'Cet visiteur n\'appartient pas au salarie sélectionné'})

        # Gestion selon le rôle de l'utilisateur
        if user.role == ROLE_DEALER:
            # Le champ visiteur est maintenant optionnel pour les salariés
            data['salarie'] = user
            data['entreprise'] = user.entreprise
            if visiteur:
                data['visiteur'] = visiteur
        elif user.role == ROLE_AGRICULTEUR:
            data['visiteur'] = user
            data['salarie'] = user.salarie
            data['entreprise'] = user.entreprise
        else:
            # Pour admin et entreprise, utiliser les valeurs validées
            data['entreprise'] = entreprise
            data['salarie'] = salarie
            data['visiteur'] = visiteur

        print(f"[PlanViewSet] perform_create - Données finales: {data}")
        serializer.save(createur=user, **data)

    def retrieve(self, request, *args, **kwargs):
        """
        Récupère un plan avec ses détails complets
        """
        print(f"\n[PlanViewSet][retrieve] Début de la récupération - Plan ID: {kwargs.get('pk')}")
        try:
            instance = self.get_object()
            print(f"[PlanViewSet][retrieve] Plan trouvé: {instance.id} - {instance.nom}")
            serializer = self.get_serializer(instance, context={'request': request})
            print(f"[PlanViewSet][retrieve] Sérialisation terminée")
            print(f"[PlanViewSet][retrieve] Champs disponibles: {serializer.data.keys()}")
            print(f"[PlanViewSet][retrieve] Détails entreprise présents: {'entreprise_details' in serializer.data}")
            print(f"[PlanViewSet][retrieve] Détails salarie présents: {'salarie_details' in serializer.data}")
            print(f"[PlanViewSet][retrieve] Détails client présents: {'client_details' in serializer.data}")
            return Response(serializer.data)
        except Exception as e:
            print(f"[PlanViewSet][retrieve] ERREUR: {str(e)}")
            raise

class SalarieViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des salariés."""
    queryset = User.objects.filter(role=ROLE_DEALER)
    serializer_class = SalarieSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == ROLE_ADMIN:
            return User.objects.filter(role=ROLE_DEALER)
        return User.objects.none()

    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """
        Récupère la liste des clients d'un salarie.
        """
        salarie = self.get_object()
        if request.user.role == ROLE_ADMIN or request.user == salarie:
            clients = User.objects.filter(salarie=salarie, role=ROLE_AGRICULTEUR)
            serializer = ClientSerializer(clients, many=True)
            return Response(serializer.data)
        return Response(
            {'detail': 'Vous n\'avez pas la permission d\'accéder à ces données.'},
            status=status.HTTP_403_FORBIDDEN
        )

    def perform_create(self, serializer):
        serializer.save(role=ROLE_DEALER)

class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des clients."""
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsSalarie]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return User.objects.filter(role='VISITEUR')
        elif user.role == 'SALARIE':
            return User.objects.filter(salarie=user, role='VISITEUR')
        return User.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'SALARIE':
            serializer.save(role='VISITEUR', salarie=self.request.user)
        else:
            serializer.save(role='VISITEUR')

class PlanViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des plans d'irrigation."""
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtre les plans selon:
        - Admin : tous les plans ou filtrés par salarie/visiteur
        - Entreprise : plans où l'entreprise est assignée ou liée à ses salaries
        - Salarie : uniquement ses plans ou ceux de ses visiteurs
        - Visiteur : uniquement ses plans
        """
        user = self.request.user
        base_queryset = Plan.objects.all()

        # Récupérer les paramètres de filtrage
        salarie_id = self.request.query_params.get('salarie')
        visiteur_id = self.request.query_params.get('visiteur')
        entreprise_id = self.request.query_params.get('entreprise')
        visiteur_null = self.request.query_params.get('visiteur_null') == 'true'

        if user.role == ROLE_ADMIN:
            if salarie_id:
                base_queryset = base_queryset.filter(salarie_id=salarie_id)
            if visiteur_id:
                base_queryset = base_queryset.filter(visiteur_id=visiteur_id)
            elif visiteur_null:
                base_queryset = base_queryset.filter(visiteur__isnull=True)
            if entreprise_id:
                base_queryset = base_queryset.filter(entreprise_id=entreprise_id)
            return base_queryset
        elif user.role == ROLE_USINE:
            # Une entreprise peut voir les plans où elle est assignée directement
            # ou liés à ses salaries et leurs visiteurs
            base_queryset = base_queryset.filter(
                Q(entreprise=user) |  # Plans directement liés à l'entreprise
                Q(salarie__entreprise=user) |  # Plans liés aux salaries de l'entreprise
                Q(visiteur__salarie__entreprise=user)  # Plans liés aux visiteurs des salaries de l'entreprise
            )

            # Filtres additionnels si spécifiés
            if salarie_id:
                base_queryset = base_queryset.filter(salarie_id=salarie_id)
            if visiteur_id:
                base_queryset = base_queryset.filter(visiteur_id=visiteur_id)
            elif visiteur_null:
                base_queryset = base_queryset.filter(visiteur__isnull=True)

            return base_queryset
        elif user.role == ROLE_DEALER:
            # Filtrer d'abord par le salarie connecté
            base_queryset = base_queryset.filter(salarie=user)
            # Si un visiteur est spécifié, filtrer par cet visiteur
            if visiteur_id:
                base_queryset = base_queryset.filter(visiteur_id=visiteur_id)
            elif visiteur_null:
                base_queryset = base_queryset.filter(visiteur__isnull=True)
            return base_queryset
        else:  # visiteur
            return base_queryset.filter(visiteur=user)

    def get_serializer_class(self):
        """
        Retourne le serializer approprié selon le contexte.
        """
        print(f"[PlanViewSet] get_serializer_class - Action: {self.action}, Params: {self.request.query_params}")

        # Si l'action est 'list' et que le paramètre include_details est True, utiliser PlanDetailSerializer
        if self.action == 'list' and self.request.query_params.get('include_details') == 'true':
            print("[PlanViewSet] Utilisation de PlanDetailSerializer pour la liste avec détails")
            return PlanDetailSerializer
        elif self.action in ['retrieve', 'update', 'partial_update', 'save_with_elements']:
            print(f"[PlanViewSet] Utilisation de PlanDetailSerializer pour {self.action}")
            return PlanDetailSerializer

        print(f"[PlanViewSet] Utilisation de PlanSerializer par défaut pour {self.action}")
        return PlanSerializer

    def get_serializer(self, *args, **kwargs):
        """
        Surcharge pour s'assurer que le contexte est toujours fourni au sérialiseur
        """
        serializer_class = self.get_serializer_class()

        # S'assurer que le contexte contient toujours la requête
        if 'context' not in kwargs:
            kwargs['context'] = self.get_serializer_context()

        if 'request' not in kwargs['context'] and hasattr(self, 'request'):
            kwargs['context']['request'] = self.request

        print(f"[PlanViewSet][get_serializer] Création d'un sérialiseur {serializer_class.__name__} avec contexte: {kwargs['context'].keys()}")

        return serializer_class(*args, **kwargs)

    def get_serializer_context(self):
        """
        Ajoute des éléments supplémentaires au contexte du sérialiseur
        """
        context = super().get_serializer_context()

        # Debug du contexte
        print(f"[PlanViewSet][get_serializer_context] Contexte de base: {context.keys()}")

        # S'assurer que la requête est dans le contexte
        if 'request' not in context and hasattr(self, 'request'):
            context['request'] = self.request
            print(f"[PlanViewSet][get_serializer_context] Ajout de la requête au contexte")

        return context

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def save_with_elements(self, request, pk=None):
        """
        Sauvegarde un plan avec ses formes géométriques, connexions et annotations
        """
        print(f"\n[PlanViewSet][save_with_elements] Début de la sauvegarde - Plan ID: {pk}")
        print(f"[PlanViewSet][save_with_elements] URL de la requête: {request.path}")
        print(f"[PlanViewSet][save_with_elements] Méthode: {request.method}")
        print(f"[PlanViewSet][save_with_elements] User: {request.user.username} (role: {request.user.role})")

        try:
            plan = self.get_object()
            print(f"[PlanViewSet][save_with_elements] Plan trouvé: {plan.id} - {plan.nom}")
            print(f"[PlanViewSet][save_with_elements] Détails du plan:")
            print(f" - Entreprise: {plan.entreprise.id if plan.entreprise else None} - {plan.entreprise.username if plan.entreprise else 'N/A'}")
            print(f" - Salarie: {plan.salarie.id if plan.salarie else None} - {plan.salarie.username if plan.salarie else 'N/A'}")
            print(f" - Visiteur: {plan.visiteur.id if plan.visiteur else None} - {plan.visiteur.username if plan.visiteur else 'N/A'}")
        except Exception as e:
            print(f"[PlanViewSet][save_with_elements] ERREUR lors de la récupération du plan: {str(e)}")
            raise

        # Vérifier les permissions
        if (plan.createur != request.user and
            request.user.role not in [ROLE_ADMIN, ROLE_DEALER] and
            (request.user.role == ROLE_DEALER and plan.createur.salarie != request.user)):
            print(f"[PlanViewSet][save_with_elements] Permission refusée pour l'utilisateur {request.user.username}")
            return Response(
                {'detail': 'Vous n\'avez pas la permission de modifier ce plan'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Récupérer les données des éléments
        formes_data = request.data.get('formes', [])
        connexions_data = request.data.get('connexions', [])
        annotations_data = request.data.get('annotations', [])
        elements_to_delete = request.data.get('elementsToDelete', [])

        print(f"[PlanViewSet][save_with_elements] Données reçues:")
        print(f"- Formes: {len(formes_data)} éléments")
        print(f"- Connexions: {len(connexions_data)} éléments")
        print(f"- Annotations: {len(annotations_data)} éléments")
        print(f"- Éléments à supprimer: {elements_to_delete}")

        try:
            # Supprimer les éléments existants si demandé
            if request.data.get('clear_existing', False):
                print("[PlanViewSet][save_with_elements] Suppression de tous les éléments existants")
                plan.formes.all().delete()
                plan.connexions.all().delete()
                plan.annotations.all().delete()

            # Supprimer les éléments spécifiques demandés
            if elements_to_delete:
                print(f"[PlanViewSet][save_with_elements] Suppression des éléments: {elements_to_delete}")
                deleted_count = FormeGeometrique.objects.filter(
                    id__in=elements_to_delete,
                    plan=plan
                ).delete()[0]
                print(f"[PlanViewSet][save_with_elements] {deleted_count} éléments supprimés")

            # Créer/Mettre à jour les formes
            for forme_data in formes_data:
                forme_id = forme_data.pop('id', None)
                type_forme = forme_data.get('type_forme')
                data = forme_data.get('data', {})

                print(f"[PlanViewSet][save_with_elements] Traitement forme: ID={forme_id}, Type={type_forme}")

                if forme_id:
                    try:
                        forme = FormeGeometrique.objects.get(id=forme_id, plan=plan)
                        print(f"[PlanViewSet][save_with_elements] Mise à jour forme existante: {forme_id}")
                        forme.type_forme = type_forme
                        forme.data = data
                        forme.save()
                    except FormeGeometrique.DoesNotExist:
                        print(f"[PlanViewSet][save_with_elements] Forme {forme_id} non trouvée, création d'une nouvelle")
                        FormeGeometrique.objects.create(
                            plan=plan,
                            type_forme=type_forme,
                            data=data
                        )
                else:
                    print("[PlanViewSet][save_with_elements] Création d'une nouvelle forme")
                    FormeGeometrique.objects.create(
                        plan=plan,
                        type_forme=type_forme,
                        data=data
                    )

            # Sauvegarder les préférences
            if preferences := request.data.get('preferences'):
                print("[PlanViewSet][save_with_elements] Mise à jour des préférences")
                plan.preferences = preferences
                plan.save(update_fields=['preferences'])

            # Forcer la mise à jour de la date de modification
            plan.touch()
            print("[PlanViewSet][save_with_elements] Sauvegarde réussie")

            # Retourner le plan mis à jour avec les détails complets
            serializer = PlanDetailSerializer(plan, context={'request': request})
            print(f"[PlanViewSet][save_with_elements] Sérialisation du plan avec détails complets")
            print(f"[PlanViewSet][save_with_elements] Champs sérialisés: {serializer.data.keys()}")
            print(f"[PlanViewSet][save_with_elements] Détails entreprise présents: {'entreprise_details' in serializer.data}")
            print(f"[PlanViewSet][save_with_elements] Détails salarie présents: {'salarie_details' in serializer.data}")
            print(f"[PlanViewSet][save_with_elements] Détails client présents: {'client_details' in serializer.data}")

            return Response(serializer.data)

        except Exception as e:
            print(f"[PlanViewSet][save_with_elements] ERREUR lors de la sauvegarde: {str(e)}")
            print(f"[PlanViewSet][save_with_elements] Type d'erreur: {type(e)}")
            import traceback
            print(f"[PlanViewSet][save_with_elements] Traceback:\n{traceback.format_exc()}")
            return Response(
                {'detail': f'Erreur lors de la sauvegarde: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class FormeGeometriqueViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des formes géométriques."""
    serializer_class = FormeGeometriqueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Ne retourne que les formes des plans accessibles à l'utilisateur
        """
        user = self.request.user
        if user.role == ROLE_ADMIN:
            return FormeGeometrique.objects.all()
        elif user.role == ROLE_DEALER:
            return FormeGeometrique.objects.filter(
                plan__createur__in=[user.id] + list(user.utilisateurs.values_list('id', flat=True))
            )
        else:  # client
            return FormeGeometrique.objects.filter(plan__createur=user)

    def perform_create(self, serializer):
        """
        Vérifie que l'utilisateur a le droit de créer une forme sur ce plan
        """
        plan = serializer.validated_data['plan']
        user = self.request.user

        if plan.createur != user and user.role not in ['admin', 'salarie']:
            raise PermissionError('Vous n\'avez pas la permission de modifier ce plan')

        serializer.save()

class ConnexionViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des connexions entre formes."""
    serializer_class = ConnexionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Connexion.objects.all()
        elif user.role == 'salarie':
            return Connexion.objects.filter(
                plan__createur__in=[user.id] + list(user.clients.values_list('id', flat=True))
            )
        else:  # client
            return Connexion.objects.filter(plan__createur=user)

class TexteAnnotationViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des annotations textuelles."""
    serializer_class = TexteAnnotationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return TexteAnnotation.objects.all()
        elif user.role == 'salarie':
            return TexteAnnotation.objects.filter(
                plan__createur__in=[user.id] + list(user.clients.values_list('id', flat=True))
            )
        else:  # client
            return TexteAnnotation.objects.filter(plan__createur=user)

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
                Q(plan__isnull=True) |  # Notes sans plan
                Q(plan__entreprise=user) |
                Q(plan__salarie__entreprise=user) |
                Q(plan__visiteur__salarie__entreprise=user)
            )
        elif user.role == ROLE_DEALER:
            # Un salarie peut voir ses notes et celles de ses visiteurs
            return GeoNote.objects.filter(
                Q(plan__isnull=True) |  # Notes sans plan
                Q(plan__salarie=user) |
                Q(plan__visiteur__salarie=user)
            )
        else:  # visiteur
            return GeoNote.objects.filter(
                Q(plan__isnull=True) |  # Notes sans plan
                Q(plan__visiteur=user)
            )

    def perform_create(self, serializer):
        """
        Vérifie que l'utilisateur a le droit de créer une note sur ce plan
        """
        plan = serializer.validated_data.get('plan')
        user = self.request.user

        # Si c'est une note simple sans plan, on peut créer directement
        if plan is None:
            print(f"[GeoNoteViewSet][perform_create] Création d'une note simple sans plan par {user.username}")
            serializer.save()
            return

        # Vérifier les permissions pour un plan existant
        if plan.createur != user and user.role not in [ROLE_ADMIN, ROLE_DEALER]:
            raise PermissionDenied('Vous n\'avez pas la permission de modifier ce plan')

        serializer.save()

class NoteCommentViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des commentaires sur les notes."""
    serializer_class = NoteCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtre les commentaires par note si note_id est présent dans l'URL
        """
        queryset = NoteComment.objects.all()

        # Si nous sommes dans une URL imbriquée, filtrer par note_id
        note_id = self.kwargs.get('note_pk')
        if note_id:
            queryset = queryset.filter(note_id=note_id)

        # Filtrer ensuite par les permissions de l'utilisateur
        user = self.request.user
        if user.role == ROLE_ADMIN:
            return queryset
        elif user.role == ROLE_USINE:
            # Une entreprise peut voir les commentaires des notes auxquelles elle a accès
            note_ids = GeoNote.objects.filter(
                Q(plan__entreprise=user) |
                Q(plan__salarie__entreprise=user) |
                Q(plan__visiteur__salarie__entreprise=user)
            ).values_list('id', flat=True)
            return queryset.filter(note_id__in=note_ids)
        elif user.role == ROLE_DEALER:
            # Un salarie peut voir les commentaires des notes auxquelles il a accès
            note_ids = GeoNote.objects.filter(
                Q(plan__salarie=user) |
                Q(plan__visiteur__salarie=user)
            ).values_list('id', flat=True)
            return queryset.filter(note_id__in=note_ids)
        else:  # visiteur
            # Un visiteur ne peut voir que les commentaires des notes de ses plans
            note_ids = GeoNote.objects.filter(plan__visiteur=user).values_list('id', flat=True)
            return queryset.filter(note_id__in=note_ids)

    def create(self, request, *args, **kwargs):
        """
        Surcharge de la création pour ajouter des logs et gérer note_pk
        """
        print("\n[NoteCommentViewSet][create] ====== DÉBUT CRÉATION COMMENTAIRE ======")

        # Si nous sommes dans une URL imbriquée, ajouter note_id aux données
        note_pk = self.kwargs.get('note_pk')

        # Vérifier le type des données et les traiter en conséquence
        if isinstance(request.data, str):
            # Si les données sont une chaîne, essayer de la parser comme JSON
            try:
                import json
                data = json.loads(request.data)
                print(f"[NoteCommentViewSet][create] Données converties de chaîne à dict: {data}")
            except json.JSONDecodeError:
                # Si ce n'est pas du JSON valide, créer un nouveau dict
                data = {}
                print(f"[NoteCommentViewSet][create] Données invalides, création d'un nouveau dict")
        else:
            # Sinon, copier les données existantes
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            print(f"[NoteCommentViewSet][create] Données copiées: {data}")

        if note_pk:
            data['note'] = note_pk

        # S'assurer que l'utilisateur est défini
        if 'user' not in data:
            data['user'] = request.user.id

        print(f"Données finales: {data}")
        print(f"Utilisateur: {request.user.username} (role: {request.user.role})")

        serializer = self.get_serializer(data=data)
        print(f"Serializer valide: {serializer.is_valid()}")

        if not serializer.is_valid():
            print(f"Erreurs de validation: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(serializer)
            print("[NoteCommentViewSet][create] Commentaire créé avec succès")
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"[NoteCommentViewSet][create] Erreur lors de la création: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """
        Assigne l'utilisateur courant au commentaire et vérifie les permissions
        """
        print("\n[NoteCommentViewSet][perform_create] ====== VÉRIFICATION PERMISSIONS ======")
        note = serializer.validated_data['note']
        user = self.request.user
        print(f"Note ID: {note.id}")
        print(f"Utilisateur: {user.username} (role: {user.role})")

        # Seuls les entreprises et les admins peuvent ajouter des commentaires
        if user.role not in [ROLE_ADMIN, ROLE_USINE]:
            print(f"[NoteCommentViewSet][perform_create] Permission refusée - rôle incorrect: {user.role}")
            raise PermissionDenied('Seules les entreprises peuvent ajouter des commentaires')

        # Vérifier que l'utilisateur a accès à la note
        # 1. Vérifier si l'utilisateur est le créateur de la note (si la note a un champ createur)
        creator_access = False
        if hasattr(note, 'createur') and note.createur == user:
            creator_access = True
            print(f"[NoteCommentViewSet][perform_create] Accès en tant que créateur: {creator_access}")

        # 2. Pour les notes sans plan (privées ou standalone)
        if note.plan is None:
            # Permettre l'accès si c'est une note privée créée par l'utilisateur
            if creator_access:
                print("[NoteCommentViewSet][perform_create] Accès autorisé: Note privée créée par l'utilisateur")
                serializer.save(user=user)
                return
            # Les admins ont toujours accès
            if user.role == ROLE_ADMIN:
                print("[NoteCommentViewSet][perform_create] Accès autorisé: Utilisateur admin")
                serializer.save(user=user)
                return

        # 3. Vérifier les accès via les relations plan-entreprise-salarie-visiteur
        plan_access = GeoNote.objects.filter(
            id=note.id
        ).filter(
            Q(plan__entreprise=user) |
            Q(plan__salarie__entreprise=user) |
            Q(plan__visiteur__salarie__entreprise=user)
        ).exists()

        print(f"[NoteCommentViewSet][perform_create] Accès via plan: {plan_access}")

        if creator_access or plan_access or user.role == ROLE_ADMIN:
            print("[NoteCommentViewSet][perform_create] Accès autorisé")
            serializer.save(user=user)
            return

        print("[NoteCommentViewSet][perform_create] Permission refusée - pas d'accès à la note")
        raise PermissionDenied('Vous n\'avez pas accès à cette note')

class NotePhotoViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des photos des notes."""
    serializer_class = NotePhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtre les photos par note si note_id est présent dans l'URL
        """
        queryset = NotePhoto.objects.all()

        # Si nous sommes dans une URL imbriquée, filtrer par note_id
        note_id = self.kwargs.get('note_pk')
        if note_id:
            queryset = queryset.filter(note_id=note_id)

        # Filtrer ensuite par les permissions de l'utilisateur
        user = self.request.user
        if user.role == ROLE_ADMIN:
            return queryset
        elif user.role in [ROLE_USINE, ROLE_DEALER]:
            # Entreprises et salariés peuvent voir toutes les photos des notes auxquelles ils ont accès
            note_ids = GeoNote.objects.filter(
                Q(plan__entreprise=user) |
                Q(plan__salarie=user) |
                Q(plan__salarie__entreprise=user) |
                Q(plan__visiteur__salarie=user) |
                Q(plan__visiteur__salarie__entreprise=user)
            ).values_list('id', flat=True)
            return queryset.filter(note_id__in=note_ids)
        else:  # visiteur
            # Les visiteurs ne peuvent voir que les photos des notes de leurs plans
            note_ids = GeoNote.objects.filter(plan__visiteur=user).values_list('id', flat=True)
            return queryset.filter(note_id__in=note_ids)

    def create(self, request, *args, **kwargs):
        """
        Surcharge de la création pour gérer note_pk
        """
        # Si nous sommes dans une URL imbriquée, ajouter note_id aux données
        note_pk = self.kwargs.get('note_pk')

        # Vérifier le type des données et les traiter en conséquence
        if isinstance(request.data, str):
            # Si les données sont une chaîne, essayer de la parser comme JSON
            try:
                import json
                data = json.loads(request.data)
                print(f"[NotePhotoViewSet][create] Données converties de chaîne à dict: {data}")
            except json.JSONDecodeError:
                # Si ce n'est pas du JSON valide, créer un nouveau dict
                data = {}
                print(f"[NotePhotoViewSet][create] Données invalides, création d'un nouveau dict")
        else:
            # Sinon, copier les données existantes
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            print(f"[NotePhotoViewSet][create] Données copiées: {data}")

        if note_pk:
            data['note'] = note_pk

        # S'assurer que l'utilisateur est défini
        if 'user' not in data:
            data['user'] = request.user.id

        print(f"[NotePhotoViewSet][create] Données finales: {data}")
        print(f"[NotePhotoViewSet][create] Utilisateur: {request.user.username} (role: {request.user.role})")

        serializer = self.get_serializer(data=data)

        if not serializer.is_valid():
            print(f"[NotePhotoViewSet][create] Erreurs de validation: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(serializer)
            print("[NotePhotoViewSet][create] Photo créée avec succès")
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"[NotePhotoViewSet][create] Erreur lors de la création: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """
        Assigne l'utilisateur courant à la photo et vérifie les permissions et le quota
        """
        note = serializer.validated_data['note']
        user = self.request.user

        print(f"[NotePhotoViewSet][perform_create] Note ID: {note.id}")
        print(f"[NotePhotoViewSet][perform_create] Utilisateur: {user.username} (role: {user.role})")

        # 1. Vérifier si l'utilisateur est le créateur de la note
        creator_access = False
        if hasattr(note, 'createur') and note.createur == user:
            creator_access = True
            print(f"[NotePhotoViewSet][perform_create] Accès en tant que créateur: {creator_access}")

        # 2. Pour les notes sans plan (privées ou standalone)
        if note.plan is None:
            # Permettre l'accès si c'est une note privée créée par l'utilisateur
            if creator_access:
                print("[NotePhotoViewSet][perform_create] Accès autorisé: Note privée créée par l'utilisateur")
                # Continuer pour ajouter la photo après vérification du quota
            # Les admins ont toujours accès
            elif user.role == ROLE_ADMIN:
                print("[NotePhotoViewSet][perform_create] Accès autorisé: Utilisateur admin")
                # Continuer pour ajouter la photo après vérification du quota
            else:
                print("[NotePhotoViewSet][perform_create] Permission refusée pour note privée")
                raise PermissionDenied("Vous n'avez pas accès à cette note")
        else:
            # 3. Vérifier les accès via les relations plan-entreprise-salarie-visiteur
            plan_access = GeoNote.objects.filter(
                id=note.id
            ).filter(
                Q(plan__entreprise=user) |
                Q(plan__salarie=user) |
                Q(plan__salarie__entreprise=user) |
                Q(plan__visiteur__salarie=user) |
                Q(plan__visiteur__salarie__entreprise=user)
            ).exists()

            print(f"[NotePhotoViewSet][perform_create] Accès via plan: {plan_access}")

            if not (creator_access or plan_access or user.role == ROLE_ADMIN):
                print("[NotePhotoViewSet][perform_create] Permission refusée - pas d'accès à la note")
                raise PermissionDenied('Vous n\'avez pas accès à cette note')

        # Vérifier le quota de stockage
        if 'image' in serializer.validated_data:
            image = serializer.validated_data['image']
            # Estimer la taille en MB
            estimated_size_mb = image.size / (1024 * 1024)

            if user.storage_used + round(estimated_size_mb) > user.storage_quota:
                raise ValidationError({
                    'image': f"Quota de stockage dépassé. Vous avez utilisé {user.storage_used}MB sur {user.storage_quota}MB."
                })

        serializer.save(user=user)
        print("[NotePhotoViewSet][perform_create] Photo sauvegardée avec succès")

@api_view(['POST'])
def elevation_proxy(request):
    """
    Proxy pour les requêtes d'élévation vers l'API Open-Elevation.
    """
    try:
        points = request.data.get('points', [])

        # Reformater les points pour l'API Open-Elevation
        try:
            locations = [
                {
                    'latitude': float(point['latitude']),
                    'longitude': float(point['longitude'])
                }
                for point in points
            ]
        except (KeyError, TypeError, ValueError) as e:
            return Response(
                {'error': f'Format de données invalide: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Appel à l'API Open-Elevation
        response = requests.post(
            'https://api.open-elevation.com/api/v1/lookup',
            json={'locations': locations}
        )

        if response.status_code == 200:
            return Response(response.json())

        # Si l'API principale échoue, essayer l'API de fallback
        fallback_response = requests.post(
            'https://elevation-api.io/api/elevation',
            json={'points': [{'lat': p['latitude'], 'lng': p['longitude']} for p in points]}
        )

        if fallback_response.status_code == 200:
            # Reformater la réponse pour correspondre au format attendu
            elevation_data = fallback_response.json()
            results = [
                {
                    'latitude': points[i]['latitude'],
                    'longitude': points[i]['longitude'],
                    'elevation': e['elevation']
                }
                for i, e in enumerate(elevation_data['elevations'])
            ]
            return Response({'results': results})

        return Response(
            {'error': 'Les services d\'élévation sont indisponibles'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    except Exception as e:
        print("Erreur complète:", str(e))
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class NoteColumnViewSet(viewsets.ViewSet):
    """ViewSet pour la gestion des colonnes de notes fixes."""
    permission_classes = [permissions.IsAuthenticated]

    FIXED_COLUMNS = [
        {'id': '1', 'title': 'Idées', 'color': '#8B5CF6', 'order': 0, 'is_default': False},
        {'id': '2', 'title': 'À faire', 'color': '#F59E0B', 'order': 1, 'is_default': True},
        {'id': '3', 'title': 'En cours', 'color': '#3B82F6', 'order': 2, 'is_default': False},
        {'id': '4', 'title': 'Terminées', 'color': '#10B981', 'order': 3, 'is_default': False},
        {'id': '5', 'title': 'Autres', 'color': '#6B7280', 'order': 4, 'is_default': False}
    ]

    def list(self, request):
        """Retourne la liste des colonnes fixes."""
        serializer = NoteColumnSerializer(self.FIXED_COLUMNS, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Retourne une colonne fixe par son ID."""
        try:
            column = next(col for col in self.FIXED_COLUMNS if col['id'] == pk)
            serializer = NoteColumnSerializer(column)
            return Response(serializer.data)
        except StopIteration:
            return Response(
                {'detail': 'Colonne non trouvée.'},
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        return Response(
            {'detail': 'Les colonnes sont fixes et ne peuvent pas être modifiées.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def update(self, request, pk=None):
        return Response(
            {'detail': 'Les colonnes sont fixes et ne peuvent pas être modifiées.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def destroy(self, request, pk=None):
        return Response(
            {'detail': 'Les colonnes sont fixes et ne peuvent pas être supprimées.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
