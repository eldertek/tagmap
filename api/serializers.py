from rest_framework import serializers
from django.contrib.auth import get_user_model
from plans.models import Plan, FormeGeometrique, Connexion, TexteAnnotation, GeoNote, NoteComment, NotePhoto, MapFilter
from authentication.models import Utilisateur
from django.core.files.base import ContentFile
import base64
import uuid
from PIL import Image
from io import BytesIO
from rest_framework import viewsets

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
    entreprise_id = serializers.IntegerField(source='entreprise.id', read_only=True)
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
            'createur', 'entreprise', 'entreprise_id', 'salarie', 'visiteur', 'preferences',
            'elements', 'historique'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def validate(self, data):
        """Valide les relations entre entreprise, salarie et visiteur."""
        if 'visiteur' in data and data['visiteur'] and not data.get('salarie'):
            raise serializers.ValidationError({
                'salarie': 'Un salarie doit être spécifié si un visiteur est assigné.'
            })

        if 'salarie' in data and data['salarie'] and not data.get('entreprise'):
            raise serializers.ValidationError({
                'entreprise': 'Une entreprise doit être spécifiée si un salarie est assigné.'
            })

        return data

    def create(self, validated_data):
        user = self.context['request'].user

        if user.role == 'VISITEUR':
            validated_data['visiteur'] = user
            validated_data['salarie'] = user.salarie
            validated_data['entreprise'] = user.salarie.entreprise if user.salarie else None
            validated_data['createur'] = user
        elif 'visiteur' in validated_data and validated_data['visiteur']:
            validated_data['createur'] = validated_data['visiteur']
        else:
            validated_data['createur'] = self.context['request'].user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'visiteur' in validated_data and validated_data['visiteur']:
            instance.createur = validated_data['visiteur']

        instance = super().update(instance, validated_data)
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

    def validate(self, data):
        note = data.get('note')
        if not note:
            raise serializers.ValidationError({
                'note': "Une note doit être spécifiée"
            })

        text = data.get('text', '').strip()
        if not text:
            raise serializers.ValidationError({
                'text': "Le texte ne peut pas être vide"
            })

        return data

    def create(self, validated_data):
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


class NoteColumnSerializer(serializers.Serializer):
    """Sérialiseur pour les colonnes de notes fixes."""
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    color = serializers.CharField(read_only=True)
    order = serializers.IntegerField(read_only=True)
    is_default = serializers.BooleanField(read_only=True)

    def to_representation(self, instance):
        """
        Surcharge pour gérer à la fois les dictionnaires et les chaînes de caractères.
        """
        if isinstance(instance, str):
            # Si l'instance est une chaîne (ID de colonne), récupérer les détails de la colonne
            COLUMN_DETAILS = {
                '1': {'id': '1', 'title': 'Idées', 'color': '#8B5CF6', 'order': 0, 'is_default': False},
                '2': {'id': '2', 'title': 'À faire', 'color': '#F59E0B', 'order': 1, 'is_default': True},
                '3': {'id': '3', 'title': 'En cours', 'color': '#3B82F6', 'order': 2, 'is_default': False},
                '4': {'id': '4', 'title': 'Terminées', 'color': '#10B981', 'order': 3, 'is_default': False},
                '5': {'id': '5', 'title': 'Autres', 'color': '#6B7280', 'order': 4, 'is_default': False}
            }
            return COLUMN_DETAILS.get(instance, COLUMN_DETAILS['1'])
        # Si c'est déjà un dictionnaire, le retourner tel quel
        return instance

class GeoNoteSerializer(serializers.ModelSerializer):
    comments = NoteCommentSerializer(many=True, read_only=True)
    photos = NotePhotoSerializer(many=True, read_only=True)
    column_details = NoteColumnSerializer(source='column', read_only=True)
    column_id = serializers.CharField(write_only=True, required=False)
    is_geolocated = serializers.SerializerMethodField(read_only=True)
    enterprise_name = serializers.CharField(source='enterprise_id.company_name', read_only=True)

    # Ajouter des logs pour le style

    class Meta:
        model = GeoNote
        fields = [
            'id', 'plan', 'title', 'description', 'location',
            'column', 'column_id', 'column_details',
            'access_level', 'style', 'order', 'created_at', 'updated_at',
            'category', 'comments', 'photos', 'is_geolocated', 'enterprise_id', 'enterprise_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'plan': {'required': False, 'allow_null': True},
            'enterprise_id': {'required': False, 'allow_null': True},
        }

    def get_is_geolocated(self, obj):
        """Retourne True si la note possède une location, False sinon."""
        return obj.location is not None

    def validate(self, data):
        print(f"\n[GeoNoteSerializer][validate] Validation des données de note: {data}")

        # Vérifier que le plan existe s'il est fourni
        if 'plan' in data and data['plan'] is not None and not Plan.objects.filter(id=data['plan'].id).exists():
            raise serializers.ValidationError({
                'plan': 'Le plan spécifié n\'existe pas.'
            })

        # Vérifier que l'entreprise existe si elle est fournie
        if 'enterprise_id' in data and data['enterprise_id'] is not None:
            if not User.objects.filter(id=data['enterprise_id'].id, role='ENTREPRISE').exists():
                raise serializers.ValidationError({
                    'enterprise_id': 'L\'entreprise spécifiée n\'existe pas.'
                })

        # Gérer la colonne
        # Priorité 1: utiliser 'column' s'il est déjà défini dans data
        # Priorité 2: utiliser 'column_id' s'il est fourni
        # Priorité 3: utiliser '1' (Idées) comme valeur par défaut pour les nouvelles notes
        if 'column' not in data:
            column_id = data.pop('column_id', None)
            if column_id:
                if column_id not in ['1', '2', '3', '4', '5']:
                    raise serializers.ValidationError({
                        'column_id': 'ID de colonne invalide. Doit être entre 1 et 5.'
                    })
                data['column'] = column_id
            elif not self.instance:  # Seulement pour les nouvelles notes
                data['column'] = '1'  # Colonne "Idées" par défaut

        if 'column' in data:
            print(f"[GeoNoteSerializer][validate] Colonne finale: {data['column']}")

        # Si l'utilisateur n'est pas admin, on associe automatiquement à son entreprise
        request = self.context.get('request')
        if request and request.user and request.user.role != 'ADMIN':
            if request.user.role == 'ENTREPRISE':
                data['enterprise_id'] = request.user
            elif request.user.role in ['SALARIE', 'VISITEUR'] and hasattr(request.user, 'entreprise') and request.user.entreprise:
                data['enterprise_id'] = request.user.entreprise

        return data

    def create(self, validated_data):
        """
        S'assurer que la note est bien créée avec une colonne assignée
        """
        print(f"\n[GeoNoteSerializer][create] Création de note avec données: {validated_data}")

        # S'assurer que la colonne est définie
        if 'column' not in validated_data:
            validated_data['column'] = '1'  # Colonne "Idées" par défaut

        # Si l'utilisateur n'est pas admin et qu'aucune entreprise n'est définie, utiliser celle de l'utilisateur
        request = self.context.get('request')
        if request and request.user and 'enterprise_id' not in validated_data:
            if request.user.role == 'ENTREPRISE':
                validated_data['enterprise_id'] = request.user
            elif request.user.role in ['SALARIE', 'VISITEUR'] and hasattr(request.user, 'entreprise') and request.user.entreprise:
                validated_data['enterprise_id'] = request.user.entreprise

        print(f"[GeoNoteSerializer][create] Données finales pour création: {validated_data}")
        instance = super().create(validated_data)
        print(f"[GeoNoteSerializer][create] Note créée avec succès, ID: {instance.id}, Colonne: {instance.column}, Entreprise: {instance.enterprise_id}")
        return instance

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
    entreprise_id_read = serializers.IntegerField(source='entreprise.id', read_only=True)
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

    entreprise_details = serializers.SerializerMethodField()
    salarie_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id', 'nom', 'description', 'date_creation', 'date_modification',
            'createur', 'entreprise', 'entreprise_id', 'entreprise_id_read', 'salarie', 'salarie_id',
            'visiteur', 'visiteur_id', 'formes', 'connexions', 'annotations',
            'preferences', 'elements', 'historique',
            'entreprise_details', 'salarie_details', 'client_details'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def get_entreprise_details(self, obj):
        if obj.entreprise:
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.entreprise, context=self._context)
            result = serializer.data

            if 'logo' not in result and hasattr(obj.entreprise, 'logo') and obj.entreprise.logo:
                try:
                    from django.conf import settings
                    if hasattr(obj.entreprise.logo, 'url'):
                        logo_url = obj.entreprise.logo.url
                    else:
                        logo_path = str(obj.entreprise.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"
                    result['logo'] = logo_url
                except Exception:
                    pass

            return result
        return None

    def get_salarie_details(self, obj):
        if obj.salarie:
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.salarie, context=self._context)
            result = serializer.data

            if 'logo' not in result and hasattr(obj.salarie, 'logo') and obj.salarie.logo:
                try:
                    from django.conf import settings
                    if hasattr(obj.salarie.logo, 'url'):
                        logo_url = obj.salarie.logo.url
                    else:
                        logo_path = str(obj.salarie.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"
                    result['logo'] = logo_url
                except Exception:
                    pass

            return result
        return None

    def get_client_details(self, obj):
        if obj.visiteur:
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True

            serializer = UserDetailsSerializer(obj.visiteur, context=self._context)
            result = serializer.data

            if 'logo' not in result and hasattr(obj.visiteur, 'logo') and obj.visiteur.logo:
                try:
                    from django.conf import settings
                    if hasattr(obj.visiteur.logo, 'url'):
                        logo_url = obj.visiteur.logo.url
                    else:
                        logo_path = str(obj.visiteur.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"
                    result['logo'] = logo_url
                except Exception:
                    pass

            return result
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if data.get('entreprise') is None and instance.entreprise:
            data['entreprise'] = UserDetailsSerializer(instance.entreprise, context=self.context).data

        if data.get('salarie') is None and instance.salarie:
            data['salarie'] = UserDetailsSerializer(instance.salarie, context=self.context).data

        if data.get('visiteur') is None and instance.visiteur:
            data['visiteur'] = UserDetailsSerializer(instance.visiteur, context=self.context).data

        return data

    def validate(self, data):
        if 'visiteur' in data and data['visiteur'] and not data.get('salarie'):
            raise serializers.ValidationError({
                'salarie': 'Un salarie doit être spécifié si un visiteur est assigné.'
            })

        if 'salarie' in data and data['salarie'] and not data.get('entreprise'):
            raise serializers.ValidationError({
                'entreprise': 'Une entreprise doit être spécifiée si un salarie est assigné.'
            })

        return data

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data['createur'] = self.context['request'].user
        return super().create(validated_data)

class EcowittDeviceSerializer(serializers.Serializer):
    """Sérialiseur pour les appareils Ecowitt."""
    id = serializers.IntegerField(required=False)
    name = serializers.CharField()
    mac = serializers.CharField()
    type = serializers.IntegerField(required=False)
    date_zone_id = serializers.CharField(source='timezone', required=False, allow_null=True)
    timezone = serializers.CharField(source='date_zone_id', required=False, allow_null=True)
    createtime = serializers.IntegerField(required=False)  # Utiliser champ natif sans conversion
    created_at = serializers.SerializerMethodField(read_only=True)  # Champ calculé séparé
    longitude = serializers.FloatField(required=False)
    latitude = serializers.FloatField(required=False)
    station_type = serializers.CharField(source='stationtype', required=False, allow_null=True)
    iot_devices = serializers.ListField(source='iotdevice_list', required=False, default=list)

    def get_created_at(self, obj):
        """Convertit le champ createtime en datetime."""
        try:
            from datetime import datetime
            createtime = obj.get('createtime', None)
            if createtime and isinstance(createtime, (int, str)):
                return datetime.fromtimestamp(int(createtime))
        except (ValueError, TypeError, AttributeError):
            pass
        return None

    def to_representation(self, instance):
        """Convertit les données et ajoute des champs calculés."""
        # Vérifier si instance est un dict (plus sûr)
        if not isinstance(instance, dict):
            instance = dict(instance)

        data = super().to_representation(instance)

        # Ajout de la position formatée pour l'affichage si latitude et longitude sont disponibles
        if 'latitude' in data and 'longitude' in data:
            if data.get('latitude') is not None and data.get('longitude') is not None:
                data['position'] = f"{data['latitude']}, {data['longitude']}"

        # Extraction de la version du firmware depuis station_type
        station_type = data.get('station_type') or ''
        if '_V' in station_type:
            model, version = station_type.split('_V', 1)
            data['model'] = model
            data['firmware_version'] = version
        else:
            data['model'] = station_type
            data['firmware_version'] = 'Inconnue'

        # S'assurer que tous les champs nécessaires sont présents
        # même s'ils n'étaient pas dans les données sources
        default_fields = {
            'id': data.get('id', 0),
            'type': data.get('type', 0),
            'date_zone_id': data.get('date_zone_id', 'UTC'),
            'timezone': data.get('timezone', 'UTC'),
            'longitude': data.get('longitude', 0.0),
            'latitude': data.get('latitude', 0.0),
            'station_type': data.get('station_type', ''),
            'iot_devices': data.get('iot_devices', []),
            'position': data.get('position', 'N/A'),
            'model': data.get('model', ''),
            'firmware_version': data.get('firmware_version', 'Inconnue')
        }

        # Ajouter les champs manquants avec leurs valeurs par défaut
        for key, value in default_fields.items():
            if key not in data or data[key] is None:
                data[key] = value

        return data

class WeatherDataSerializer(serializers.Serializer):
    """Sérialiseur pour les données météo en temps réel."""
    outdoor = serializers.DictField(required=False)
    indoor = serializers.DictField(required=False)
    pressure = serializers.DictField(required=False)
    wind = serializers.DictField(required=False)
    rainfall = serializers.DictField(required=False)
    solar_and_uvi = serializers.DictField(required=False)
    battery = serializers.DictField(required=False)
    timestamp = serializers.DateTimeField(required=False)

    def to_representation(self, instance):
        """
        Convertit les valeurs textuelles en valeurs numériques appropriées
        lorsque c'est possible.
        """
        data = super().to_representation(instance)

        # Convertir les valeurs de pression de texte en nombre
        if 'pressure' in data:
            self._convert_nested_values(data['pressure'])

        # Convertir d'autres valeurs numériques en nombres
        if 'outdoor' in data:
            self._convert_nested_values(data['outdoor'])

        if 'indoor' in data:
            self._convert_nested_values(data['indoor'])

        if 'wind' in data:
            self._convert_nested_values(data['wind'])

        if 'rainfall' in data:
            self._convert_nested_values(data['rainfall'])

        if 'solar_and_uvi' in data:
            self._convert_nested_values(data['solar_and_uvi'])

        return data

    def _convert_nested_values(self, data_dict):
        """
        Convertit récursivement les valeurs textuelles en nombres
        dans un dictionnaire imbriqué.
        """
        if not isinstance(data_dict, dict):
            return

        for key, value in data_dict.items():
            if isinstance(value, dict):
                # Si c'est un dict contenant unit et value, convertir la valeur
                if 'value' in value and isinstance(value['value'], str):
                    try:
                        value['value'] = float(value['value'])
                    except (ValueError, TypeError):
                        # Garder la valeur telle quelle si la conversion échoue
                        pass
                # Sinon, traiter récursivement
                else:
                    self._convert_nested_values(value)

class WeatherHistoryDataSerializer(serializers.Serializer):
    """Sérialiseur pour les données météo historiques."""
    outdoor = serializers.DictField(required=False)
    indoor = serializers.DictField(required=False)
    pressure = serializers.DictField(required=False)
    wind = serializers.DictField(required=False)
    rainfall = serializers.DictField(required=False)
    solar_and_uvi = serializers.DictField(required=False)

    def to_representation(self, instance):
        """
        Traite les données historiques pour les adapter au format attendu par les graphiques.
        """
        data = super().to_representation(instance)

        # Formatage des données de température extérieure
        if 'outdoor' in data and 'temperature' in data['outdoor']:
            self._format_time_series_data(data['outdoor']['temperature'])

        # Formatage des données d'humidité extérieure
        if 'outdoor' in data and 'humidity' in data['outdoor']:
            self._format_time_series_data(data['outdoor']['humidity'])

        # Formatage des données de pression
        if 'pressure' in data and 'relative' in data['pressure']:
            self._format_time_series_data(data['pressure']['relative'])

        # Formatage des données de vent
        if 'wind' in data:
            if 'wind_speed' in data['wind']:
                self._format_time_series_data(data['wind']['wind_speed'])
            if 'wind_gust' in data['wind']:
                self._format_time_series_data(data['wind']['wind_gust'])

        # Formatage des données de précipitations
        if 'rainfall' in data:
            for key in data['rainfall']:
                self._format_time_series_data(data['rainfall'][key])

        # Formatage des données solaires
        if 'solar_and_uvi' in data and 'solar' in data['solar_and_uvi']:
            self._format_time_series_data(data['solar_and_uvi']['solar'])

        return data

    def _format_time_series_data(self, data_list):
        """
        Convertit les valeurs des séries temporelles en nombres
        et formate les horodatages.
        """
        if not isinstance(data_list, list):
            return

        for item in data_list:
            # Convertir les valeurs en nombres si possible
            if 'value' in item and isinstance(item['value'], str):
                try:
                    item['value'] = float(item['value'])
                except (ValueError, TypeError):
                    pass

class WeatherChartDataSerializer(serializers.Serializer):
    """Sérialiseur pour les données de graphiques météo."""
    type = serializers.CharField()
    labels = serializers.ListField(child=serializers.CharField())
    datasets = serializers.ListField(
        child=serializers.DictField()
    )
    raw_data = serializers.DictField(required=False)
    error = serializers.CharField(required=False)

class NoteColumnViewSet(viewsets.ViewSet):
    """ViewSet pour la gestion des colonnes de notes fixes."""
    FIXED_COLUMNS = [
        {'id': '1', 'title': 'Idées', 'color': '#8B5CF6', 'order': 0, 'is_default': False},
        {'id': '2', 'title': 'À faire', 'color': '#F59E0B', 'order': 1, 'is_default': True},
        {'id': '3', 'title': 'En cours', 'color': '#3B82F6', 'order': 2, 'is_default': False},
        {'id': '4', 'title': 'Terminées', 'color': '#10B981', 'order': 3, 'is_default': False},
        {'id': '5', 'title': 'Autres', 'color': '#6B7280', 'order': 4, 'is_default': False}
    ]


class MapFilterSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les filtres de carte personnalisés."""
    entreprise_name = serializers.CharField(source='entreprise.company_name', read_only=True)

    class Meta:
        model = MapFilter
        fields = ['id', 'name', 'category', 'description', 'entreprise', 'entreprise_name', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']