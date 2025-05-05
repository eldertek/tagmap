from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Utilisateur

User = get_user_model()

class UserDetailsSerializer(serializers.ModelSerializer):
    """Sérialiseur simplifié pour les détails d'utilisateur (utilisé dans les relations)."""
    display_name = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'company_name', 'role', 'display_name', 'logo']

    def get_display_name(self, obj):
        """Retourne le nom d'affichage standardisé de l'utilisateur."""
        return obj.get_display_name()

    def get_logo(self, obj):
        """Retourne l'URL du logo de l'utilisateur s'il existe."""

        if not hasattr(obj, 'logo'):
            return None


        if not obj.logo:
            return None

        try:
            from django.conf import settings

            # Simplement retourner l'URL relative commençant par "/"
            if hasattr(obj.logo, 'url'):
                logo_url = obj.logo.url
                return logo_url
            else:
                # Construire un chemin relatif en préfixant avec MEDIA_URL
                logo_path = str(obj.logo)
                logo_url = f"{settings.MEDIA_URL}{logo_path}"
                return logo_url

        except Exception as e:
            import traceback

            # En cas d'erreur, tenter une solution de secours
            try:
                from django.conf import settings
                logo_path = str(obj.logo)
                return f"{settings.MEDIA_URL}{logo_path}"
            except:
                # Si tout échoue, retourner le chemin brut avec un "/" au début
                return f"/{str(obj.logo)}"

class UserNestedSerializer(UserDetailsSerializer):
    """Sérialiseur pour les relations imbriquées, évite les boucles infinies."""
    class Meta(UserDetailsSerializer.Meta):
        model = User
        fields = UserDetailsSerializer.Meta.fields

class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'utilisateur avec gestion des rôles et du salarie."""
    password = serializers.CharField(write_only=True, required=False)
    old_password = serializers.CharField(write_only=True, required=False)
    salarie_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    permissions = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()
    salarie_id = serializers.PrimaryKeyRelatedField(
        source='salarie',
        queryset=User.objects.filter(role='SALARIE'),
        required=False,
        allow_null=True,
        write_only=True
    )
    plans_count = serializers.SerializerMethodField()
    entreprise = UserNestedSerializer(read_only=True)
    entreprise_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='ENTREPRISE'),
        source='entreprise',
        required=False,
        allow_null=True,
        write_only=True
    )
    salarie = UserNestedSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'old_password', 'role', 'salarie', 'salarie_id',
            'salarie_name', 'company_name', 'must_change_password', 'phone',
            'full_name', 'is_active', 'permissions', 'user_type', 'plans_count',
            'entreprise', 'entreprise_id', 'logo', 'ecowitt_api_key', 'ecowitt_application_key',
            'storage_quota', 'storage_used'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'role': {'required': True}
        }

    def validate(self, data):
        """Valide les données de l'utilisateur."""
        role = data.get('role', self.instance.role if self.instance else None)
        salarie = data.get('salarie')
        entreprise = data.get('entreprise')


        # Validation pour les salaries
        if role == 'SALARIE':
            if not entreprise and (not self.instance or not self.instance.entreprise):
                raise serializers.ValidationError({
                    'entreprise': 'Une entreprise doit être spécifiée pour un salarie'
                })

        # Validation pour les visiteurs
        elif role == 'VISITEUR':
            if not salarie and (not self.instance or not self.instance.salarie):
                raise serializers.ValidationError({
                    'salarie': 'Un salarie doit être spécifié pour un visiteur'
                })

            # Vérifier que le salarie existe et a une entreprise
            if salarie:
                try:
                    salarie = User.objects.get(id=salarie.id if isinstance(salarie, User) else salarie)
                    if salarie.role != 'SALARIE':
                        raise serializers.ValidationError({
                            'salarie': 'L\'utilisateur sélectionné n\'est pas un salarie'
                        })
                    if not salarie.entreprise:
                        raise serializers.ValidationError({
                            'salarie': 'Le salarie doit être rattaché à une entreprise'
                        })
                except User.DoesNotExist:
                    raise serializers.ValidationError({
                        'salarie': 'Ce salarie n\'existe pas'
                    })

        return data

    def to_representation(self, instance):
        """Surcharge la représentation pour inclure les relations imbriquées."""

        data = super().to_representation(instance)

        # Pour un salarie, inclure son entreprise
        if instance.role == 'SALARIE':
            data['entreprise'] = UserNestedSerializer(instance.entreprise).data if instance.entreprise else None

        # Pour un visiteur, inclure son salarie et l'entreprise associée
        elif instance.role == 'VISITEUR':
            if instance.salarie:
                salarie_data = UserNestedSerializer(instance.salarie).data
                # Si le salarie a une entreprise, l'inclure dans ses données
                if instance.salarie.entreprise:
                    salarie_data['entreprise'] = UserNestedSerializer(instance.salarie.entreprise).data
                data['salarie'] = salarie_data
                # Inclure aussi l'entreprise directement au niveau racine pour faciliter l'accès
                data['entreprise'] = UserNestedSerializer(instance.salarie.entreprise).data if instance.salarie.entreprise else None

        return data

    def get_salarie_name(self, obj):
        """Retourne le nom du salarie si l'utilisateur en a un."""
        if obj.salarie:
            return obj.salarie.get_display_name()
        return None

    def get_full_name(self, obj):
        """Retourne le nom complet de l'utilisateur."""
        return obj.get_display_name()

    def get_permissions(self, obj):
        """Retourne les permissions de l'utilisateur basées sur son rôle."""
        permissions = {
            'can_manage_users': obj.role in ['ADMIN', 'SALARIE'],
            'can_manage_plans': True,  # Tous les utilisateurs peuvent gérer leurs plans
            'can_view_all_plans': obj.role in ['ADMIN', 'SALARIE'],
            'can_manage_salaries': obj.role == 'ADMIN'
        }
        return permissions

    def get_user_type(self, obj):
        """Maps the role field to the frontend's expected user_type values."""
        role_mapping = {
            'ADMIN': 'admin',
            'ENTREPRISE': 'entreprise',
            'SALARIE': 'salarie',
            'VISITEUR': 'visiteur'
        }
        return role_mapping.get(obj.role, 'visiteur')

    def get_plans_count(self, obj):
        """Retourne le nombre de plans de l'utilisateur."""
        return obj.plans.count()

    def validate_password(self, value):
        """Valide le mot de passe selon les règles de Django."""
        validate_password(value)
        return value

    def create(self, validated_data):
        """Crée un nouvel utilisateur avec un mot de passe hashé."""
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        """Met à jour un utilisateur existant."""
        password = validated_data.pop('password', None)
        old_password = validated_data.pop('old_password', None)


        # Si un nouveau mot de passe est fourni
        if password:
            if instance.must_change_password or (old_password and instance.check_password(old_password)):
                instance.set_password(password)
                instance.must_change_password = False
            else:
                raise serializers.ValidationError({
                    'old_password': ['Mot de passe actuel incorrect.']
                })

        # Gérer les relations selon le rôle
        role = validated_data.get('role', instance.role)

        # Pour un salarie
        if role == 'SALARIE':
            entreprise = validated_data.get('entreprise')
            if entreprise:
                instance.entreprise = entreprise
                instance.salarie = None  # Un salarie ne peut pas avoir de salarie
            elif not instance.entreprise:
                raise serializers.ValidationError({
                    'entreprise': 'Une entreprise doit être spécifiée pour un salarie'
                })

        # Pour un visiteur
        elif role == 'VISITEUR':
            salarie = validated_data.get('salarie')
            if salarie:
                instance.salarie = salarie
                instance.entreprise = None  # Un visiteur ne peut pas avoir d'entreprise directement
            elif not instance.salarie:
                raise serializers.ValidationError({
                    'salarie': 'Un salarie doit être spécifié pour un visiteur'
                })

        # Pour une entreprise
        elif role == 'ENTREPRISE':
            instance.entreprise = None
            instance.salarie = None

        # Pour un admin
        elif role == 'ADMIN':
            instance.entreprise = None
            instance.salarie = None

        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            if attr not in ['entreprise', 'salarie']:
                setattr(instance, attr, value)

        instance.save()
        return instance

class SalarieListSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la liste des salaries."""
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'company_name', 'name']

    def get_name(self, obj):
        """Retourne le nom d'affichage standardisé du salarie."""
        return obj.get_display_name()