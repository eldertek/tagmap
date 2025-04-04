from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.auth import get_user_model
from plans.models import Plan, FormeGeometrique, Connexion, TexteAnnotation, GeoNote, NoteComment, NotePhoto
from authentication.models import Utilisateur
from django.core.files.base import ContentFile
import base64
import uuid
from PIL import Image
from io import BytesIO

User = get_user_model()  # Ceci pointera vers authentication.Utilisateur

class UserSerializer(serializers.ModelSerializer):
    salarie_name = serializers.CharField(source='salarie.get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                 'role', 'salarie', 'salarie_name', 'company_name',
                 'phone', 'date_joined']
        read_only_fields = ['date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class SalarieSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                 'company_name', 'phone']
        read_only_fields = ['role']

    def validate(self, data):
        if self.instance and self.instance.role != 'dealer':
            raise serializers.ValidationError("Cet utilisateur n'est pas un salarie")
        return data

class ClientSerializer(serializers.ModelSerializer):
    salarie = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='dealer')
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                 'salarie', 'company_name', 'phone']
        read_only_fields = ['role']

    def validate(self, data):
        if not data.get('salarie'):
            raise serializers.ValidationError("Un salarie doit être spécifié")
        return data

class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'company_name', 'phone']

class PlanSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les plans d'irrigation."""
    createur = UserSerializer(read_only=True)
    entreprise = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.ENTREPRISE),
        required=False,
        allow_null=True
    )
    salarie = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.SALARIE),
        required=False,
        allow_null=True
    )
    visiteur = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.VISITEUR),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Plan
        fields = [
            'id', 'nom', 'description', 'date_creation', 'date_modification',
            'createur', 'entreprise', 'salarie', 'visiteur', 'preferences',
            'elements', 'historique'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def validate(self, data):
        """Valide les relations entre entreprise, salarie et visiteur."""
        # Si un visiteur est spécifié, vérifier qu'il a un salarie
        if 'visiteur' in data and data['visiteur'] and not data.get('salarie'):
            raise serializers.ValidationError({
                'salarie': 'Un salarie doit être spécifié si un visiteur est assigné.'
            })

        # Si un salarie est spécifié, vérifier qu'il a une entreprise
        if 'salarie' in data and data['salarie'] and not data.get('entreprise'):
            raise serializers.ValidationError({
                'entreprise': 'Une entreprise doit être spécifiée si un salarie est assigné.'
            })

        return data

    def create(self, validated_data):
        print("[PlanSerializer] Création avec données:", validated_data)
        user = self.context['request'].user

        # Si l'utilisateur est un visiteur, utiliser ses relations
        if user.role == 'VISITEUR':
            validated_data['visiteur'] = user
            validated_data['salarie'] = user.salarie
            validated_data['entreprise'] = user.salarie.entreprise if user.salarie else None
            validated_data['createur'] = user
        # Si un visiteur est spécifié, il devient le créateur
        elif 'visiteur' in validated_data and validated_data['visiteur']:
            validated_data['createur'] = validated_data['visiteur']
        else:
            validated_data['createur'] = self.context['request'].user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        print("[PlanSerializer] Début update avec données:", validated_data)

        # Si un client est assigné, il devient le créateur
        if 'visiteur' in validated_data and validated_data['visiteur']:
            instance.createur = validated_data['visiteur']

        instance = super().update(instance, validated_data)
        print(f"[PlanSerializer] Fin update - salarie_id: {instance.salarie_id}, client_id: {instance.visiteur_id}")
        return instance

class FormeGeometriqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormeGeometrique
        fields = ['id', 'plan', 'type_forme', 'data']
        read_only_fields = ['id']

    def validate(self, attrs):
        """Valide les données selon le type de forme."""
        type_forme = attrs.get('type_forme')
        data = attrs.get('data', {})

        if not data:
            raise serializers.ValidationError("Les données de la forme sont requises")

        # Validation spécifique selon le type de forme
        if type_forme == FormeGeometrique.TypeForme.CERCLE:
            if 'center' not in data or 'radius' not in data:
                raise serializers.ValidationError("Un cercle nécessite un centre et un rayon")
        elif type_forme == FormeGeometrique.TypeForme.RECTANGLE:
            if 'bounds' not in data:
                raise serializers.ValidationError("Un rectangle nécessite des limites (bounds)")
        elif type_forme == FormeGeometrique.TypeForme.DEMI_CERCLE:
            if not all(k in data for k in ['center', 'radius', 'startAngle', 'endAngle']):
                raise serializers.ValidationError("Un demi-cercle nécessite un centre, un rayon et des angles")
        elif type_forme == FormeGeometrique.TypeForme.LIGNE:
            if 'points' not in data:
                raise serializers.ValidationError("Une ligne nécessite des points")
        elif type_forme == FormeGeometrique.TypeForme.TEXTE:
            if not all(k in data for k in ['position', 'content']):
                raise serializers.ValidationError("Un texte nécessite une position et un contenu")

        return attrs

class ConnexionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Connexion
        fields = ['id', 'plan', 'forme_source', 'forme_destination', 'geometrie']
        read_only_fields = ['id']

    def validate(self, data):
        """
        Vérifie que les formes appartiennent au même plan
        """
        plan = data.get('plan')
        forme_source = data.get('forme_source')
        forme_destination = data.get('forme_destination')

        if forme_source and forme_destination:
            if forme_source.plan != plan or forme_destination.plan != plan:
                raise serializers.ValidationError(
                    "Les formes source et destination doivent appartenir au même plan"
                )

        return data

class TexteAnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TexteAnnotation
        fields = ['id', 'plan', 'texte', 'position', 'rotation']
        read_only_fields = ['id']


class Base64ImageField(serializers.ImageField):
    """
    Champ personnalisé pour gérer les images en base64.
    """
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            # Format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]

            # Générer un nom de fichier unique
            filename = f"{uuid.uuid4()}.{ext}"

            # Décoder l'image base64
            data = ContentFile(base64.b64decode(imgstr), name=filename)

            # Compresser l'image
            img = Image.open(data)
            img_io = BytesIO()

            # Redimensionner si l'image est trop grande
            max_size = (1200, 1200)
            if img.width > max_size[0] or img.height > max_size[1]:
                img.thumbnail(max_size, Image.LANCZOS)

            # Sauvegarder avec compression
            if ext.lower() == 'png':
                img.save(img_io, format='PNG', optimize=True)
            else:
                img.save(img_io, format='JPEG', quality=70, optimize=True)

            # Créer un nouveau ContentFile avec l'image compressée
            data = ContentFile(img_io.getvalue(), name=filename)

        return super().to_internal_value(data)


class NoteCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = NoteComment
        fields = ['id', 'note', 'user', 'text', 'created_at', 'user_name', 'user_role']
        read_only_fields = ['id', 'created_at', 'user_name', 'user_role']

    def get_user_name(self, obj):
        return obj.user.get_display_name() if obj.user else 'Utilisateur inconnu'

    def get_user_role(self, obj):
        return obj.user.role if obj.user else ''

    def create(self, validated_data):
        # Assigner l'utilisateur courant si non spécifié
        if 'user' not in validated_data and self.context.get('request'):
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotePhotoSerializer(serializers.ModelSerializer):
    image = Base64ImageField()
    caption = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = NotePhoto
        fields = ['id', 'note', 'user', 'image', 'caption', 'created_at', 'size']
        read_only_fields = ['id', 'created_at', 'size']

    def validate(self, data):
        # Vérifier le quota de l'utilisateur
        user = data.get('user') or self.context['request'].user

        # Estimer la taille de l'image (en MB)
        if 'image' in data and hasattr(data['image'], 'size'):
            # Convertir octets en MB
            estimated_size_mb = data['image'].size / (1024 * 1024)

            # Vérifier si l'ajout dépasserait le quota
            if user.storage_used + round(estimated_size_mb) > user.storage_quota:
                raise serializers.ValidationError({
                    'image': f"Quota de stockage dépassé. Vous avez utilisé {user.storage_used}MB sur {user.storage_quota}MB."
                })

        return data

    def create(self, validated_data):
        # Assigner l'utilisateur courant si non spécifié
        if 'user' not in validated_data and self.context.get('request'):
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class GeoNoteSerializer(serializers.ModelSerializer):
    comments = NoteCommentSerializer(many=True, read_only=True)
    photos = NotePhotoSerializer(many=True, read_only=True)

    class Meta:
        model = GeoNote
        fields = [
            'id', 'plan', 'title', 'description', 'location', 'column_id',
            'access_level', 'style', 'order', 'created_at', 'updated_at',
            'category', 'comments', 'photos'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Vérifier que le plan existe
        if 'plan' in data and not Plan.objects.filter(id=data['plan'].id).exists():
            raise serializers.ValidationError({
                'plan': 'Le plan spécifié n\'existe pas.'
            })

        return data

class PlanDetailSerializer(serializers.ModelSerializer):
    createur = UserDetailsSerializer(read_only=True)
    entreprise = UserDetailsSerializer(read_only=True)
    entreprise_id = serializers.PrimaryKeyRelatedField(
        source='entreprise',
        queryset=User.objects.filter(role=Utilisateur.Role.ENTREPRISE),
        required=False,
        allow_null=True,
        write_only=True
    )
    salarie = UserDetailsSerializer(read_only=True)
    salarie_id = serializers.PrimaryKeyRelatedField(
        source='salarie',
        queryset=User.objects.filter(role=Utilisateur.Role.SALARIE),
        required=False,
        allow_null=True,
        write_only=True
    )
    visiteur = UserDetailsSerializer(read_only=True)
    visiteur_id = serializers.PrimaryKeyRelatedField(
        source='visiteur',
        queryset=User.objects.filter(role=Utilisateur.Role.VISITEUR),
        required=False,
        allow_null=True,
        write_only=True
    )
    formes = FormeGeometriqueSerializer(many=True, read_only=True)
    connexions = ConnexionSerializer(many=True, read_only=True)
    annotations = TexteAnnotationSerializer(many=True, read_only=True)

    # Nouveaux champs pour les détails enrichis
    entreprise_details = serializers.SerializerMethodField()
    salarie_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id', 'nom', 'description', 'date_creation', 'date_modification',
            'createur', 'entreprise', 'entreprise_id', 'salarie', 'salarie_id',
            'visiteur', 'visiteur_id', 'formes', 'connexions', 'annotations',
            'preferences', 'elements', 'historique',
            'entreprise_details', 'salarie_details', 'client_details'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def get_entreprise_details(self, obj):
        """Retourne les détails complets de l'entreprise liée au plan."""
        if obj.entreprise:
            print(f"[PlanDetailSerializer][get_entreprise_details] Récupération des détails pour l'entreprise: {obj.entreprise.id}")
            print(f"[PlanDetailSerializer][get_entreprise_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")

            # Vérifier si le logo est configuré
            if hasattr(obj.entreprise, 'logo'):
                print(f"[PlanDetailSerializer][get_entreprise_details] L'entreprise a un attribut logo: {obj.entreprise.logo}")
            else:
                print(f"[PlanDetailSerializer][get_entreprise_details] L'entreprise n'a pas d'attribut logo")

            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.entreprise, context=self._context)
            result = serializer.data

            print(f"[PlanDetailSerializer][get_entreprise_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_entreprise_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_entreprise_details] Logo présent: {'logo' in result}")

            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.entreprise, 'logo') and obj.entreprise.logo:
                try:
                    from django.conf import settings

                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.entreprise.logo, 'url'):
                        logo_url = obj.entreprise.logo.url
                    else:
                        logo_path = str(obj.entreprise.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"

                    print(f"[PlanDetailSerializer][get_entreprise_details] Ajout forcé du logo: {logo_url}")
                    result['logo'] = logo_url
                except Exception as e:
                    print(f"[PlanDetailSerializer][get_entreprise_details] Erreur lors de l'ajout forcé du logo: {str(e)}")

            return result
        return None

    def get_salarie_details(self, obj):
        """Retourne les détails complets du salarie lié au plan."""
        if obj.salarie:
            print(f"[PlanDetailSerializer][get_salarie_details] Récupération des détails pour le salarie: {obj.salarie.id}")
            print(f"[PlanDetailSerializer][get_salarie_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")

            # Vérifier si le logo est configuré
            if hasattr(obj.salarie, 'logo'):
                print(f"[PlanDetailSerializer][get_salarie_details] Le salarie a un attribut logo: {obj.salarie.logo}")
            else:
                print(f"[PlanDetailSerializer][get_salarie_details] Le salarie n'a pas d'attribut logo")

            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.salarie, context=self._context)
            result = serializer.data

            print(f"[PlanDetailSerializer][get_salarie_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_salarie_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_salarie_details] Logo présent: {'logo' in result}")

            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.salarie, 'logo') and obj.salarie.logo:
                try:
                    from django.conf import settings

                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.salarie.logo, 'url'):
                        logo_url = obj.salarie.logo.url
                    else:
                        logo_path = str(obj.salarie.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"

                    print(f"[PlanDetailSerializer][get_salarie_details] Ajout forcé du logo: {logo_url}")
                    result['logo'] = logo_url
                except Exception as e:
                    print(f"[PlanDetailSerializer][get_salarie_details] Erreur lors de l'ajout forcé du logo: {str(e)}")

            return result
        return None

    def get_client_details(self, obj):
        """Retourne les détails complets du client (visiteur) lié au plan."""
        if obj.visiteur:
            print(f"[PlanDetailSerializer][get_client_details] Récupération des détails pour le client: {obj.visiteur.id}")
            print(f"[PlanDetailSerializer][get_client_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")

            # Vérifier si le logo est configuré
            if hasattr(obj.visiteur, 'logo'):
                print(f"[PlanDetailSerializer][get_client_details] Le client a un attribut logo: {obj.visiteur.logo}")
            else:
                print(f"[PlanDetailSerializer][get_client_details] Le client n'a pas d'attribut logo")

            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.visiteur, context=self._context)
            result = serializer.data

            print(f"[PlanDetailSerializer][get_client_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_client_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_client_details] Logo présent: {'logo' in result}")

            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.visiteur, 'logo') and obj.visiteur.logo:
                try:
                    from django.conf import settings

                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.visiteur.logo, 'url'):
                        logo_url = obj.visiteur.logo.url
                    else:
                        logo_path = str(obj.visiteur.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"

                    print(f"[PlanDetailSerializer][get_client_details] Ajout forcé du logo: {logo_url}")
                    result['logo'] = logo_url
                except Exception as e:
                    print(f"[PlanDetailSerializer][get_client_details] Erreur lors de l'ajout forcé du logo: {str(e)}")

            return result
        return None

    def to_representation(self, instance):
        """
        Surcharge pour s'assurer que les relations sont renvoyées comme des objets.
        """
        print(f"\n[PlanDetailSerializer] Début to_representation pour plan {instance.id}")
        print(f"- Entreprise: {instance.entreprise_id} ({type(instance.entreprise_id)})")
        print(f"- Salarie: {instance.salarie_id} ({type(instance.salarie_id)})")
        print(f"- Visiteur: {instance.visiteur_id} ({type(instance.visiteur_id)})")

        # Utiliser super() pour obtenir la représentation de base
        data = super().to_representation(instance)

        print("\nDonnées sérialisées initiales:")
        print("- entreprise:", data.get('entreprise'))
        print("- salarie:", data.get('salarie'))
        print("- visiteur:", data.get('visiteur'))

        # S'assurer que les relations sont bien sérialisées en objets complets
        if data.get('entreprise') is None and instance.entreprise:
            print(f"[PlanDetailSerializer] Forçage sérialisation de entreprise: {instance.entreprise}")
            data['entreprise'] = UserDetailsSerializer(instance.entreprise, context=self.context).data

        if data.get('salarie') is None and instance.salarie:
            print(f"[PlanDetailSerializer] Forçage sérialisation de salarie: {instance.salarie}")
            data['salarie'] = UserDetailsSerializer(instance.salarie, context=self.context).data

        if data.get('visiteur') is None and instance.visiteur:
            print(f"[PlanDetailSerializer] Forçage sérialisation de visiteur: {instance.visiteur}")
            data['visiteur'] = UserDetailsSerializer(instance.visiteur, context=self.context).data

        print("\nDonnées sérialisées finales:")
        print("- entreprise:", data.get('entreprise'))
        print("- salarie:", data.get('salarie'))
        print("- visiteur:", data.get('visiteur'))

        return data

    def validate(self, data):
        """Valide les relations entre entreprise, salarie et visiteur."""
        print("\n[PlanDetailSerializer] Validation des données:", data)

        # Si un visiteur est spécifié, vérifier qu'il a un salarie
        if 'visiteur' in data and data['visiteur'] and not data.get('salarie'):
            raise serializers.ValidationError({
                'salarie': 'Un salarie doit être spécifié si un visiteur est assigné.'
            })

        # Si un salarie est spécifié, vérifier qu'il a une entreprise
        if 'salarie' in data and data['salarie'] and not data.get('entreprise'):
            raise serializers.ValidationError({
                'entreprise': 'Une entreprise doit être spécifiée si un salarie est assigné.'
            })

        return data

    def update(self, instance, validated_data):
        print("\n[PlanDetailSerializer] Début update avec données:", validated_data)
        print(f"État initial - entreprise: {instance.entreprise_id}, salarie: {instance.salarie_id}, visiteur: {instance.visiteur_id}")

        instance = super().update(instance, validated_data)

        print(f"État final - entreprise: {instance.entreprise_id}, salarie: {instance.salarie_id}, visiteur: {instance.visiteur_id}")
        return instance

    def create(self, validated_data):
        validated_data['createur'] = self.context['request'].user
        return super().create(validated_data)