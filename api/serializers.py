from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.auth import get_user_model
from plans.models import Plan, FormeGeometrique, Connexion, TexteAnnotation
from authentication.models import Utilisateur

User = get_user_model()  # Ceci pointera vers authentication.Utilisateur

class UserSerializer(serializers.ModelSerializer):
    concessionnaire_name = serializers.CharField(source='concessionnaire.get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'role', 'concessionnaire', 'concessionnaire_name', 'company_name', 
                 'phone', 'date_joined']
        read_only_fields = ['date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class ConcessionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'company_name', 'phone']
        read_only_fields = ['role']

    def validate(self, data):
        if self.instance and self.instance.role != 'dealer':
            raise serializers.ValidationError("Cet utilisateur n'est pas un concessionnaire")
        return data

class ClientSerializer(serializers.ModelSerializer):
    concessionnaire = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='dealer')
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'concessionnaire', 'company_name', 'phone']
        read_only_fields = ['role']

    def validate(self, data):
        if not data.get('concessionnaire'):
            raise serializers.ValidationError("Un concessionnaire doit être spécifié")
        return data

class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'company_name', 'phone']

class PlanSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les plans d'irrigation."""
    createur = UserSerializer(read_only=True)
    usine = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.USINE),
        required=False,
        allow_null=True
    )
    concessionnaire = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.CONCESSIONNAIRE),
        required=False,
        allow_null=True
    )
    agriculteur = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=Utilisateur.Role.AGRICULTEUR),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Plan
        fields = [
            'id', 'nom', 'description', 'date_creation', 'date_modification',
            'createur', 'usine', 'concessionnaire', 'agriculteur', 'preferences',
            'elements', 'historique'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def validate(self, data):
        """Valide les relations entre usine, concessionnaire et agriculteur."""
        # Si un agriculteur est spécifié, vérifier qu'il a un concessionnaire
        if 'agriculteur' in data and data['agriculteur'] and not data.get('concessionnaire'):
            raise serializers.ValidationError({
                'concessionnaire': 'Un concessionnaire doit être spécifié si un agriculteur est assigné.'
            })

        # Si un concessionnaire est spécifié, vérifier qu'il a une usine
        if 'concessionnaire' in data and data['concessionnaire'] and not data.get('usine'):
            raise serializers.ValidationError({
                'usine': 'Une usine doit être spécifiée si un concessionnaire est assigné.'
            })

        return data

    def create(self, validated_data):
        print("[PlanSerializer] Création avec données:", validated_data)
        user = self.context['request'].user

        # Si l'utilisateur est un agriculteur, utiliser ses relations
        if user.role == 'AGRICULTEUR':
            validated_data['agriculteur'] = user
            validated_data['concessionnaire'] = user.concessionnaire
            validated_data['usine'] = user.concessionnaire.usine if user.concessionnaire else None
            validated_data['createur'] = user
        # Si un agriculteur est spécifié, il devient le créateur
        elif 'agriculteur' in validated_data and validated_data['agriculteur']:
            validated_data['createur'] = validated_data['agriculteur']
        else:
            validated_data['createur'] = self.context['request'].user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        print("[PlanSerializer] Début update avec données:", validated_data)
        
        # Si un client est assigné, il devient le créateur
        if 'agriculteur' in validated_data and validated_data['agriculteur']:
            instance.createur = validated_data['agriculteur']
        
        instance = super().update(instance, validated_data)
        print(f"[PlanSerializer] Fin update - concessionnaire_id: {instance.concessionnaire_id}, client_id: {instance.agriculteur_id}")
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

class PlanDetailSerializer(serializers.ModelSerializer):
    createur = UserDetailsSerializer(read_only=True)
    usine = UserDetailsSerializer(read_only=True)
    usine_id = serializers.PrimaryKeyRelatedField(
        source='usine',
        queryset=User.objects.filter(role=Utilisateur.Role.USINE),
        required=False,
        allow_null=True,
        write_only=True
    )
    concessionnaire = UserDetailsSerializer(read_only=True)
    concessionnaire_id = serializers.PrimaryKeyRelatedField(
        source='concessionnaire',
        queryset=User.objects.filter(role=Utilisateur.Role.CONCESSIONNAIRE),
        required=False,
        allow_null=True,
        write_only=True
    )
    agriculteur = UserDetailsSerializer(read_only=True)
    agriculteur_id = serializers.PrimaryKeyRelatedField(
        source='agriculteur',
        queryset=User.objects.filter(role=Utilisateur.Role.AGRICULTEUR),
        required=False,
        allow_null=True,
        write_only=True
    )
    formes = FormeGeometriqueSerializer(many=True, read_only=True)
    connexions = ConnexionSerializer(many=True, read_only=True)
    annotations = TexteAnnotationSerializer(many=True, read_only=True)
    
    # Nouveaux champs pour les détails enrichis
    usine_details = serializers.SerializerMethodField()
    concessionnaire_details = serializers.SerializerMethodField()
    client_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Plan
        fields = [
            'id', 'nom', 'description', 'date_creation', 'date_modification',
            'createur', 'usine', 'usine_id', 'concessionnaire', 'concessionnaire_id',
            'agriculteur', 'agriculteur_id', 'formes', 'connexions', 'annotations',
            'preferences', 'elements', 'historique', 
            'usine_details', 'concessionnaire_details', 'client_details'
        ]
        read_only_fields = ['date_creation', 'date_modification', 'historique']

    def get_usine_details(self, obj):
        """Retourne les détails complets de l'usine liée au plan."""
        if obj.usine:
            print(f"[PlanDetailSerializer][get_usine_details] Récupération des détails pour l'usine: {obj.usine.id}")
            print(f"[PlanDetailSerializer][get_usine_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")
            
            # Vérifier si le logo est configuré
            if hasattr(obj.usine, 'logo'):
                print(f"[PlanDetailSerializer][get_usine_details] L'usine a un attribut logo: {obj.usine.logo}")
            else:
                print(f"[PlanDetailSerializer][get_usine_details] L'usine n'a pas d'attribut logo")
            
            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True
                
            serializer = UserDetailsSerializer(obj.usine, context=self._context)
            result = serializer.data
            
            print(f"[PlanDetailSerializer][get_usine_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_usine_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_usine_details] Logo présent: {'logo' in result}")
            
            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.usine, 'logo') and obj.usine.logo:
                try:
                    from django.conf import settings
                    
                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.usine.logo, 'url'):
                        logo_url = obj.usine.logo.url
                    else:
                        logo_path = str(obj.usine.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"
                    
                    print(f"[PlanDetailSerializer][get_usine_details] Ajout forcé du logo: {logo_url}")
                    result['logo'] = logo_url
                except Exception as e:
                    print(f"[PlanDetailSerializer][get_usine_details] Erreur lors de l'ajout forcé du logo: {str(e)}")
            
            return result
        return None
    
    def get_concessionnaire_details(self, obj):
        """Retourne les détails complets du concessionnaire lié au plan."""
        if obj.concessionnaire:
            print(f"[PlanDetailSerializer][get_concessionnaire_details] Récupération des détails pour le concessionnaire: {obj.concessionnaire.id}")
            print(f"[PlanDetailSerializer][get_concessionnaire_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")
            
            # Vérifier si le logo est configuré
            if hasattr(obj.concessionnaire, 'logo'):
                print(f"[PlanDetailSerializer][get_concessionnaire_details] Le concessionnaire a un attribut logo: {obj.concessionnaire.logo}")
            else:
                print(f"[PlanDetailSerializer][get_concessionnaire_details] Le concessionnaire n'a pas d'attribut logo")
                
            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True
                
            serializer = UserDetailsSerializer(obj.concessionnaire, context=self._context)
            result = serializer.data
            
            print(f"[PlanDetailSerializer][get_concessionnaire_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_concessionnaire_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_concessionnaire_details] Logo présent: {'logo' in result}")
            
            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.concessionnaire, 'logo') and obj.concessionnaire.logo:
                try:
                    from django.conf import settings
                    
                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.concessionnaire.logo, 'url'):
                        logo_url = obj.concessionnaire.logo.url
                    else:
                        logo_path = str(obj.concessionnaire.logo)
                        logo_url = f"{settings.MEDIA_URL}{logo_path}"
                    
                    print(f"[PlanDetailSerializer][get_concessionnaire_details] Ajout forcé du logo: {logo_url}")
                    result['logo'] = logo_url
                except Exception as e:
                    print(f"[PlanDetailSerializer][get_concessionnaire_details] Erreur lors de l'ajout forcé du logo: {str(e)}")
            
            return result
        return None
    
    def get_client_details(self, obj):
        """Retourne les détails complets du client (agriculteur) lié au plan."""
        if obj.agriculteur:
            print(f"[PlanDetailSerializer][get_client_details] Récupération des détails pour le client: {obj.agriculteur.id}")
            print(f"[PlanDetailSerializer][get_client_details] Contexte: {self.context.keys() if self.context else 'Aucun contexte'}")
            
            # Vérifier si le logo est configuré
            if hasattr(obj.agriculteur, 'logo'):
                print(f"[PlanDetailSerializer][get_client_details] Le client a un attribut logo: {obj.agriculteur.logo}")
            else:
                print(f"[PlanDetailSerializer][get_client_details] Le client n'a pas d'attribut logo")
                
            # Créer un contexte explicite pour le sous-serializer
            if not hasattr(self, '_context_updated'):
                context = dict(self.context or {})
                self._context = context
                self._context_updated = True
                
            serializer = UserDetailsSerializer(obj.agriculteur, context=self._context)
            result = serializer.data
            
            print(f"[PlanDetailSerializer][get_client_details] Résultat de la sérialisation: {result}")
            print(f"[PlanDetailSerializer][get_client_details] Champs présents: {result.keys()}")
            print(f"[PlanDetailSerializer][get_client_details] Logo présent: {'logo' in result}")
            
            # Forcer l'inclusion du logo si l'attribut existe mais n'est pas dans le résultat
            if 'logo' not in result and hasattr(obj.agriculteur, 'logo') and obj.agriculteur.logo:
                try:
                    from django.conf import settings
                    
                    # Simplement retourner l'URL relative du logo
                    if hasattr(obj.agriculteur.logo, 'url'):
                        logo_url = obj.agriculteur.logo.url
                    else:
                        logo_path = str(obj.agriculteur.logo)
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
        print(f"- Usine: {instance.usine_id} ({type(instance.usine_id)})")
        print(f"- Concessionnaire: {instance.concessionnaire_id} ({type(instance.concessionnaire_id)})")
        print(f"- Agriculteur: {instance.agriculteur_id} ({type(instance.agriculteur_id)})")
        
        # Utiliser super() pour obtenir la représentation de base
        data = super().to_representation(instance)
        
        print("\nDonnées sérialisées initiales:")
        print("- usine:", data.get('usine'))
        print("- concessionnaire:", data.get('concessionnaire'))
        print("- agriculteur:", data.get('agriculteur'))
        
        # S'assurer que les relations sont bien sérialisées en objets complets
        if data.get('usine') is None and instance.usine:
            print(f"[PlanDetailSerializer] Forçage sérialisation de usine: {instance.usine}")
            data['usine'] = UserDetailsSerializer(instance.usine, context=self.context).data
            
        if data.get('concessionnaire') is None and instance.concessionnaire:
            print(f"[PlanDetailSerializer] Forçage sérialisation de concessionnaire: {instance.concessionnaire}")
            data['concessionnaire'] = UserDetailsSerializer(instance.concessionnaire, context=self.context).data
            
        if data.get('agriculteur') is None and instance.agriculteur:
            print(f"[PlanDetailSerializer] Forçage sérialisation de agriculteur: {instance.agriculteur}")
            data['agriculteur'] = UserDetailsSerializer(instance.agriculteur, context=self.context).data
        
        print("\nDonnées sérialisées finales:")
        print("- usine:", data.get('usine'))
        print("- concessionnaire:", data.get('concessionnaire'))
        print("- agriculteur:", data.get('agriculteur'))
        
        return data

    def validate(self, data):
        """Valide les relations entre usine, concessionnaire et agriculteur."""
        print("\n[PlanDetailSerializer] Validation des données:", data)
        
        # Si un agriculteur est spécifié, vérifier qu'il a un concessionnaire
        if 'agriculteur' in data and data['agriculteur'] and not data.get('concessionnaire'):
            raise serializers.ValidationError({
                'concessionnaire': 'Un concessionnaire doit être spécifié si un agriculteur est assigné.'
            })

        # Si un concessionnaire est spécifié, vérifier qu'il a une usine
        if 'concessionnaire' in data and data['concessionnaire'] and not data.get('usine'):
            raise serializers.ValidationError({
                'usine': 'Une usine doit être spécifiée si un concessionnaire est assigné.'
            })

        return data

    def update(self, instance, validated_data):
        print("\n[PlanDetailSerializer] Début update avec données:", validated_data)
        print(f"État initial - usine: {instance.usine_id}, concessionnaire: {instance.concessionnaire_id}, agriculteur: {instance.agriculteur_id}")
        
        instance = super().update(instance, validated_data)
        
        print(f"État final - usine: {instance.usine_id}, concessionnaire: {instance.concessionnaire_id}, agriculteur: {instance.agriculteur_id}")
        return instance

    def create(self, validated_data):
        validated_data['createur'] = self.context['request'].user
        return super().create(validated_data) 