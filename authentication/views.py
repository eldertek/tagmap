from django.shortcuts import render, redirect
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, SalarieListSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.http import JsonResponse
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

User = get_user_model()

class IsAdminOrSalarieOrEntreprise(permissions.BasePermission):
    """Permission personnalisée pour les administrateurs, les salaries et les entreprises."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['ADMIN', 'SALARIE', 'ENTREPRISE']

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'ENTREPRISE':
            # L'entreprise peut gérer ses salaries et leurs visiteurs
            return (obj.role == 'SALARIE' and obj.entreprise == request.user) or \
                   (obj.role == 'VISITEUR' and obj.salarie and obj.salarie.entreprise == request.user)
        if request.user.role == 'SALARIE':
            # Le salarie ne peut voir/modifier que ses utilisateurs
            return obj.salarie == request.user
        return False

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des utilisateurs.
    Permet la création, la modification et la suppression d'utilisateurs
    avec gestion des permissions selon le rôle.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Filtre les utilisateurs selon:
        - Admin : tous les utilisateurs ou filtrés par rôle/entreprise/salarie
        - Entreprise : ses salaries et leurs visiteurs
        - Salarie : ses visiteurs
        - Visiteur : lui-même
        """
        print(f"\n[UserViewSet][get_queryset] ====== DÉBUT REQUÊTE ======")
        print(f"URL de la requête: {self.request.path}")
        print(f"Méthode: {self.request.method}")
        
        user = self.request.user
        print(f"User: {user.username} (role: {user.role}, id: {user.id})")
        
        base_queryset = User.objects.all()
        print(f"Queryset initial: {base_queryset.query}")
        
        # Récupérer les paramètres de filtrage
        role = self.request.query_params.get('role')
        entreprise_id = self.request.query_params.get('entreprise')
        salarie_id = self.request.query_params.get('salarie')
        
        print(f"Paramètres de filtrage:")
        print(f"- role: {role}")
        print(f"- entreprise_id: {entreprise_id}")
        print(f"- salarie_id: {salarie_id}")

        # Appliquer les filtres selon le rôle de l'utilisateur
        if user.role == 'ADMIN':
            print("Traitement pour ADMIN - Accès à tous les utilisateurs")
            if role:
                base_queryset = base_queryset.filter(role=role)
            if entreprise_id:
                base_queryset = base_queryset.filter(entreprise_id=entreprise_id)
            if salarie_id:
                base_queryset = base_queryset.filter(salarie_id=salarie_id)
        
        elif user.role == 'ENTREPRISE':
            print("Traitement pour ENTREPRISE")
            base_queryset = base_queryset.filter(
                Q(id=user.id) |  # Lui-même
                Q(entreprise=user) |  # Ses salaries
                Q(salarie__entreprise=user)  # Les visiteurs de ses salaries
            )
            if role:
                base_queryset = base_queryset.filter(role=role)
            if salarie_id:
                base_queryset = base_queryset.filter(salarie_id=salarie_id)
        
        elif user.role == 'SALARIE':
            print("Traitement pour SALARIE")
            base_queryset = base_queryset.filter(
                Q(id=user.id) |  # Lui-même
                Q(salarie=user)  # Ses visiteurs
            )
            if role:
                base_queryset = base_queryset.filter(role=role)
        
        else:  # VISITEUR
            print("Traitement pour VISITEUR - Accès uniquement à son propre profil")
            base_queryset = base_queryset.filter(id=user.id)

        print(f"Requête SQL finale: {base_queryset.query}")
        result = base_queryset.distinct()
        print(f"Nombre de résultats: {result.count()}")
        
        # Afficher les IDs des utilisateurs trouvés
        user_ids = list(result.values_list('id', flat=True))
        print(f"IDs des utilisateurs trouvés: {user_ids}")
        
        print("[UserViewSet][get_queryset] ====== FIN REQUÊTE ======\n")
        return result

    def get_permissions(self):
        """Définit les permissions selon l'action."""
        if self.action in ['create', 'destroy', 'list']:
            permission_classes = [IsAdminOrSalarieOrEntreprise]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne les informations de l'utilisateur connecté."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def salaries(self, request):
        """Retourne la liste des salaries."""
        salaries = User.objects.filter(role='SALARIE')
        serializer = SalarieListSerializer(salaries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_salarie(self, request, pk=None):
        """Associe un salarie à un utilisateur."""
        user = self.get_object()
        salarie_id = request.data.get('salarie_id')
        
        if not salarie_id:
            return Response(
                {'error': 'salarie_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        salarie = get_object_or_404(User, id=salarie_id, role='SALARIE')
        
        # Vérifie les permissions
        if request.user.role not in ['ADMIN', 'SALARIE', 'ENTREPRISE']:
            return Response(
                {'error': 'Permission refusée'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == 'SALARIE' and request.user != salarie:
            return Response(
                {'error': 'Un salarie ne peut assigner que lui-même'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        if request.user.role == 'ENTREPRISE' and (salarie.entreprise != request.user):
            return Response(
                {'error': 'Une entreprise ne peut assigner que ses propres salaries'},
                status=status.HTTP_403_FORBIDDEN
            )

        user.salarie = salarie
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change le mot de passe de l'utilisateur connecté."""
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Mot de passe modifié avec succès'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Déconnexion de l'utilisateur."""
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            response = Response({'message': 'Déconnexion réussie'})
            response.delete_cookie('refresh_token')
            return response
            
        except Exception as e:
            return Response(
                {'error': 'Erreur lors de la déconnexion'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_logo(self, request):
        """Upload d'un logo pour l'utilisateur connecté"""
        print(f"\n[UserViewSet][upload_logo] ====== DÉBUT UPLOAD LOGO ======")
        print(f"User: {request.user.username} (role: {request.user.role}, id: {request.user.id})")
        
        user = request.user
        if 'logo' not in request.FILES:
            print("[UserViewSet][upload_logo] Erreur: Aucun fichier logo fourni")
            return Response({'error': 'Aucun fichier logo fourni'}, status=status.HTTP_400_BAD_REQUEST)
        
        logo = request.FILES['logo']
        print(f"Logo reçu: {logo.name} (taille: {logo.size} bytes, type: {logo.content_type})")
        
        # Vérifier le type de fichier
        if not logo.name.lower().endswith(('.png', '.jpg', '.jpeg')):
            print(f"[UserViewSet][upload_logo] Erreur: Format de fichier non supporté: {logo.name}")
            return Response(
                {'error': 'Format de fichier non supporté. Utilisez PNG, JPG ou JPEG.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Vérifier la taille du fichier (max 2MB)
        if logo.size > 2 * 1024 * 1024:
            print(f"[UserViewSet][upload_logo] Erreur: Fichier trop volumineux: {logo.size} bytes")
            return Response(
                {'error': 'Le fichier est trop volumineux. Taille maximum: 2MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Sauvegarder le logo
        try:
            old_logo = user.logo
            user.logo = logo
            user.save()
            
            # Si l'ancien logo existe, le supprimer
            if old_logo:
                try:
                    old_logo.delete(save=False)
                except Exception as e:
                    print(f"[UserViewSet][upload_logo] Erreur lors de la suppression de l'ancien logo: {str(e)}")
            
            print(f"[UserViewSet][upload_logo] Logo sauvegardé avec succès: {user.logo.url}")
            
            serializer = self.get_serializer(user)
            print(f"[UserViewSet][upload_logo] Données sérialisées: {serializer.data}")
            print("[UserViewSet][upload_logo] ====== FIN UPLOAD LOGO ======\n")
            
            return Response(serializer.data)
            
        except Exception as e:
            print(f"[UserViewSet][upload_logo] ERREUR lors de la sauvegarde: {str(e)}")
            print(f"[UserViewSet][upload_logo] Type d'erreur: {type(e)}")
            import traceback
            print(f"[UserViewSet][upload_logo] Traceback:\n{traceback.format_exc()}")
            return Response(
                {'error': f'Erreur lors de la sauvegarde du logo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_object(self):
        """Surcharge pour ajouter des logs détaillés"""
        print(f"\n[UserViewSet][get_object] ====== DÉBUT RÉCUPÉRATION OBJET ======")
        print(f"URL de la requête: {self.request.path}")
        print(f"Méthode: {self.request.method}")
        print(f"User: {self.request.user.username} (role: {self.request.user.role})")
        print(f"Lookup URL kwargs: {self.kwargs}")
        
        try:
            obj = super().get_object()
            print(f"[UserViewSet][get_object] Objet trouvé: {obj.id} - {obj.username}")
            return obj
        except Exception as e:
            print(f"[UserViewSet][get_object] ERREUR lors de la récupération: {str(e)}")
            print(f"[UserViewSet][get_object] Type d'erreur: {type(e)}")
            import traceback
            print(f"[UserViewSet][get_object] Traceback:\n{traceback.format_exc()}")
            raise

    def update(self, request, *args, **kwargs):
        print(f"\n[UserViewSet][update] ====== DÉBUT UPDATE ======")
        print(f"URL de la requête: {request.path}")
        print(f"Méthode: {request.method}")
        print(f"User: {request.user.username} (role: {request.user.role})")
        print(f"Data reçue: {request.data}")
        print(f"URL kwargs: {kwargs}")
        
        try:
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
            if instance.role == 'SALARIE':
                if 'salarie' in request.data:
                    del request.data['salarie']

            # Vérifier le salarie uniquement pour les clients
            elif request.data.get('salarie'):
                try:
                    salarie = User.objects.get(
                        id=request.data['salarie'],
                        role='SALARIE'
                    )
                except User.DoesNotExist:
                    return Response(
                        {'salarie': ['Ce salarie n\'existe pas']},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Construire un message approprié basé sur les champs mis à jour
            updated_fields = []
            if 'email' in request.data:
                updated_fields.append('email')
            if 'logo' in request.FILES:
                updated_fields.append('logo')
            if 'first_name' in request.data or 'last_name' in request.data:
                updated_fields.append('informations personnelles')
            if 'company_name' in request.data:
                updated_fields.append('nom de l\'entreprise')
            if 'phone' in request.data:
                updated_fields.append('numéro de téléphone')
                
            if updated_fields:
                message = f"Mise à jour réussie : {', '.join(updated_fields)}"
            else:
                message = "Profil mis à jour avec succès"
            
            response_data = serializer.data
            response_data['message'] = message
            
            return Response(response_data)
            
        except Exception as e:
            print(f"[UserViewSet][update] ERREUR lors de l'update: {str(e)}")
            print(f"[UserViewSet][update] Type d'erreur: {type(e)}")
            import traceback
            print(f"[UserViewSet][update] Traceback:\n{traceback.format_exc()}")
            raise

class CustomTokenRefreshView(TokenRefreshView):
    """Vue personnalisée pour le rafraîchissement des tokens."""
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            refresh_token = request.COOKIES.get('refresh_token')
            if not refresh_token:
                raise InvalidToken('Aucun token de rafraîchissement fourni')
        
        try:
            refresh = RefreshToken(refresh_token)
            data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
            
            # Récupérer l'utilisateur pour renvoyer ses informations
            user = User.objects.get(id=refresh.payload.get('user_id'))
            data['user'] = UserSerializer(user).data
            
            response = Response(data)
            response.set_cookie(
                'refresh_token',
                str(refresh),
                httponly=True,
                secure=True,
                samesite='Strict',
                max_age=24 * 60 * 60  # 1 jour
            )
            return response
            
        except TokenError as e:
            raise InvalidToken(str(e))

class CustomTokenObtainPairView(TokenObtainPairView):
    """Vue personnalisée pour l'obtention du token avec stockage sécurisé."""
    
    def post(self, request, *args, **kwargs):
        print(f"\n[CustomTokenObtainPairView] ====== DÉBUT AUTHENTIFICATION ======")
        print(f"Données reçues: username={request.data.get('username')}")
        print(f"Headers: {request.headers}")
        
        try:
            print("[CustomTokenObtainPairView] Tentative d'authentification...")
            response = super().post(request, *args, **kwargs)
            print(f"[CustomTokenObtainPairView] Statut de la réponse: {response.status_code}")
            
            if response.status_code == status.HTTP_200_OK:
                user = User.objects.get(username=request.data['username'])
                print(f"[CustomTokenObtainPairView] Utilisateur trouvé: {user.username} (role: {user.role})")
                response.data['user'] = UserSerializer(user).data
                
                # Stocker le refresh token dans un cookie httpOnly
                response.set_cookie(
                    'refresh_token',
                    response.data['refresh'],
                    httponly=True,
                    secure=True,
                    samesite='Strict',
                    max_age=24 * 60 * 60  # 1 jour
                )
                
                # Supprimer le refresh token de la réponse JSON
                del response.data['refresh']
                print("[CustomTokenObtainPairView] Authentification réussie")
                
            return response
            
        except (InvalidToken, TokenError) as e:
            print(f"[CustomTokenObtainPairView] ERREUR - Token invalide: {str(e)}")
            return Response(
                {'detail': 'Identifiants incorrects'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            print(f"[CustomTokenObtainPairView] ERREUR - Exception inattendue: {str(e)}")
            print(f"[CustomTokenObtainPairView] Type d'erreur: {type(e)}")
            import traceback
            print(f"[CustomTokenObtainPairView] Traceback:\n{traceback.format_exc()}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class LoginView(TemplateView):
    """Vue de connexion qui vérifie si l'utilisateur n'est pas déjà connecté."""
    template_name = 'index.html'

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('/')
        return super().dispatch(request, *args, **kwargs)

class SecureIndexView(UserPassesTestMixin, TemplateView):
    """Vue sécurisée pour servir l'application frontend."""
    template_name = 'index.html'
    login_url = '/login/'
    
    def test_func(self):
        """Vérifie si l'utilisateur est authentifié et a un rôle valide."""
        # Ne pas appliquer aux requêtes API
        if self.request.path_info.startswith('/api/'):
            return True
            
        return (
            self.request.user.is_authenticated and 
            hasattr(self.request.user, 'role') and 
            self.request.user.role in ['ADMIN', 'SALARIE', 'UTILISATEUR']
        )

    def handle_no_permission(self):
        """Redirige vers la page de connexion si l'utilisateur n'est pas autorisé."""
        # Ne pas rediriger les requêtes API
        if self.request.path_info.startswith('/api/'):
            return JsonResponse({
                'detail': 'Authentification requise'
            }, status=401)
            
        return redirect(self.login_url)
