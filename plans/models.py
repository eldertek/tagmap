from django.contrib.gis.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from authentication.models import Utilisateur

class Plan(models.Model):
    """
    Modèle représentant un plan d'irrigation.
    """
    nom = models.CharField(max_length=200, verbose_name='Nom du plan')
    description = models.TextField(blank=True, verbose_name='Description')
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    date_modification = models.DateTimeField(auto_now=True, verbose_name='Dernière modification')
    createur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plans',
        verbose_name='Créateur'
    )
    entreprise = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plans_entreprise',
        verbose_name='Entreprise assignée',
        limit_choices_to={'role': Utilisateur.Role.ENTREPRISE}
    )
    salarie = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plans_salarie',
        verbose_name='Salarie assigné',
        limit_choices_to={'role': Utilisateur.Role.SALARIE}
    )
    visiteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plans_visiteur',
        verbose_name='Visiteur assigné',
        limit_choices_to={'role': Utilisateur.Role.VISITEUR}
    )
    preferences = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Préférences de dessin',
        help_text='Stocke les préférences de dessin (type de trait, couleurs, etc.)'
    )
    elements = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Éléments du plan',
        help_text='Stocke les éléments du plan (formes, connexions, etc.)'
    )
    historique = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Historique des modifications',
        help_text='Stocke l\'historique des modifications du plan'
    )

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'
        ordering = ['-date_modification']

    def __str__(self):
        return f"{self.nom} (créé par {self.createur.get_full_name()})"

    def touch(self):
        """Force la mise à jour de la date de modification."""
        self.date_modification = timezone.now()
        self.save(update_fields=['date_modification'])

    def clean(self):
        """Valide les relations entre entreprise, salarie et visiteur."""
        super().clean()

        # Si un visiteur est assigné, il doit avoir un salarie
        if self.visiteur and not self.salarie:
            raise ValidationError({
                'salarie': 'Un salarie doit être assigné si un visiteur est spécifié.'
            })

        # Si un salarie est assigné, il doit avoir une entreprise
        if self.salarie and not self.entreprise:
            raise ValidationError({
                'entreprise': 'Une entreprise doit être assignée si un salarie est spécifié.'
            })

        # Vérifier que le salarie appartient à l'entreprise
        if self.salarie and self.entreprise and self.salarie.entreprise != self.entreprise:
            raise ValidationError({
                'salarie': 'Le salarie doit appartenir à l\'entreprise spécifiée.'
            })

        # Vérifier que l'visiteur appartient au salarie
        if self.visiteur and self.salarie and self.visiteur.salarie != self.salarie:
            raise ValidationError({
                'visiteur': 'L\'visiteur doit appartenir au salarie spécifié.'
            })

        # Vérifier que l'visiteur appartient indirectement à l'entreprise
        if self.visiteur and self.entreprise and (not self.visiteur.salarie or self.visiteur.salarie.entreprise != self.entreprise):
            raise ValidationError({
                'visiteur': 'L\'visiteur doit appartenir à un salarie rattaché à l\'entreprise spécifiée.'
            })

class FormeGeometrique(models.Model):
    """
    Modèle de base pour toutes les formes géométriques.
    """
    class TypeForme(models.TextChoices):
        RECTANGLE = 'RECTANGLE', 'Rectangle'
        CERCLE = 'CERCLE', 'Cercle'
        DEMI_CERCLE = 'DEMI_CERCLE', 'Demi-cercle'
        LIGNE = 'LIGNE', 'Ligne'
        TEXTE = 'TEXTE', 'Texte'

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='formes',
        verbose_name='Plan associé'
    )
    type_forme = models.CharField(
        max_length=20,
        choices=TypeForme.choices,
        verbose_name='Type de forme'
    )

    # Stockage des données spécifiques à chaque type de forme
    data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Données de la forme'
    )

    class Meta:
        verbose_name = 'Forme géométrique'
        verbose_name_plural = 'Formes géométriques'

    def __str__(self):
        return f"{self.get_type_forme_display()} dans {self.plan.nom}"

    def clean(self):
        """Valide les données selon le type de forme."""
        super().clean()
        if not self.data:
            raise ValidationError("Les données de la forme sont requises")

        if self.type_forme == self.TypeForme.CERCLE:
            if 'center' not in self.data or 'radius' not in self.data:
                raise ValidationError("Un cercle nécessite un centre et un rayon")
        elif self.type_forme == self.TypeForme.RECTANGLE:
            if 'bounds' not in self.data:
                raise ValidationError("Un rectangle nécessite des limites (bounds)")
        elif self.type_forme == self.TypeForme.DEMI_CERCLE:
            if not all(k in self.data for k in ['center', 'radius', 'startAngle', 'endAngle']):
                raise ValidationError("Un demi-cercle nécessite un centre, un rayon et des angles")
        elif self.type_forme == self.TypeForme.LIGNE:
            if 'points' not in self.data:
                raise ValidationError("Une ligne nécessite des points")
        elif self.type_forme == self.TypeForme.TEXTE:
            if not all(k in self.data for k in ['position', 'content']):
                raise ValidationError("Un texte nécessite une position et un contenu")

class Connexion(models.Model):
    """
    Modèle représentant une connexion entre deux formes géométriques.
    """
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='connexions',
        verbose_name='Plan associé'
    )
    forme_source = models.ForeignKey(
        FormeGeometrique,
        on_delete=models.CASCADE,
        related_name='connexions_sortantes',
        verbose_name='Forme source'
    )
    forme_destination = models.ForeignKey(
        FormeGeometrique,
        on_delete=models.CASCADE,
        related_name='connexions_entrantes',
        verbose_name='Forme destination'
    )
    geometrie = models.LineStringField(
        srid=4326,
        verbose_name='Géométrie de la connexion'
    )

    class Meta:
        verbose_name = 'Connexion'
        verbose_name_plural = 'Connexions'

    def __str__(self):
        return f"Connexion entre {self.forme_source} et {self.forme_destination}"

class TexteAnnotation(models.Model):
    """
    Modèle pour les textes et annotations sur le plan.
    """
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='annotations',
        verbose_name='Plan associé'
    )
    texte = models.CharField(max_length=500, verbose_name='Texte')
    position = models.PointField(srid=4326, verbose_name='Position')
    rotation = models.FloatField(
        default=0,
        verbose_name='Rotation (degrés)'
    )

    class Meta:
        verbose_name = 'Texte d\'annotation'
        verbose_name_plural = 'Textes d\'annotation'

    def __str__(self):
        return f"Annotation sur {self.plan.nom}: {self.texte[:30]}..."

class GeoNote(models.Model):
    """
    Modèle pour les notes géolocalisées.
    """
    COLUMN_CHOICES = [
        ('1', 'Idées'),
        ('2', 'À faire'),
        ('3', 'En cours'),
        ('4', 'Terminées'),
        ('5', 'Autres')
    ]

    ACCESS_LEVELS = [
        ('private', 'Privé'),
        ('company', 'Entreprise'),
        ('employee', 'Salariés'),
        ('visitor', 'Visiteurs')
    ]

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='notes', null=True, blank=True)
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    location = models.PointField(srid=4326, null=True, blank=True)
    column = models.CharField(max_length=2, choices=COLUMN_CHOICES, default='1', db_index=True)
    access_level = models.CharField(max_length=10, choices=ACCESS_LEVELS, default='private', db_index=True)
    style = models.JSONField(default=dict)
    order = models.IntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    category = models.CharField(max_length=50, blank=True, db_index=True)

    class Meta:
        ordering = ['column', 'order', '-updated_at']
        verbose_name = 'Note géolocalisée'
        verbose_name_plural = 'Notes géolocalisées'
        indexes = [
            models.Index(fields=['plan', 'column', 'order']),
            models.Index(fields=['plan', 'access_level']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_column_display()})"

    @property
    def column_details(self):
        """
        Retourne les détails de la colonne fixe.
        """
        COLUMN_DETAILS = {
            '1': {'id': '1', 'title': 'Idées', 'color': '#8B5CF6', 'order': 0, 'is_default': False},
            '2': {'id': '2', 'title': 'À faire', 'color': '#F59E0B', 'order': 1, 'is_default': True},
            '3': {'id': '3', 'title': 'En cours', 'color': '#3B82F6', 'order': 2, 'is_default': False},
            '4': {'id': '4', 'title': 'Terminées', 'color': '#10B981', 'order': 3, 'is_default': False},
            '5': {'id': '5', 'title': 'Autres', 'color': '#6B7280', 'order': 4, 'is_default': False}
        }
        return COLUMN_DETAILS.get(self.column, COLUMN_DETAILS['1'])

class NoteComment(models.Model):
    """
    Modèle pour les commentaires sur les notes géolocalisées.
    """
    note = models.ForeignKey(
        GeoNote,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Note associée'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_comments',
        verbose_name='Utilisateur'
    )
    text = models.TextField(verbose_name='Texte du commentaire')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')

    class Meta:
        verbose_name = 'Commentaire de note'
        verbose_name_plural = 'Commentaires de notes'
        ordering = ['created_at']

    def __str__(self):
        return f"Commentaire de {self.user.get_display_name()} sur {self.note.title}"


def note_photo_upload_path(instance, filename):
    """Définit le chemin d'upload pour les photos de notes."""
    # Format: notes/user_id/note_id/timestamp_filename
    import os
    from django.utils import timezone

    base_name, extension = os.path.splitext(filename)
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    return f'notes/{instance.note.plan.createur.id}/{instance.note.id}/{timestamp}{extension}'


class NotePhoto(models.Model):
    """
    Modèle pour les photos attachées aux notes géolocalisées.
    """
    note = models.ForeignKey(
        GeoNote,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Note associée'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_photos',
        verbose_name='Utilisateur'
    )
    image = models.ImageField(
        upload_to=note_photo_upload_path,
        verbose_name='Image'
    )
    caption = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Légende'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    size = models.PositiveIntegerField(
        default=0,
        verbose_name='Taille (KB)',
        help_text='Taille de l\'image en kilooctets'
    )

    class Meta:
        verbose_name = 'Photo de note'
        verbose_name_plural = 'Photos de notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"Photo sur {self.note.title} par {self.user.get_display_name()}"

    def save(self, *args, **kwargs):
        # Calculer la taille de l'image si elle est nouvelle
        if self.image and not self.pk:
            # Convertir la taille en KB
            self.size = self.image.size // 1024

            # Mettre à jour le stockage utilisé par l'utilisateur
            size_mb = self.size / 1024  # Convertir KB en MB
            self.user.storage_used += round(size_mb)
            self.user.save(update_fields=['storage_used'])

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Récupérer la taille avant de supprimer
        size_mb = self.size / 1024  # Convertir KB en MB

        # Supprimer l'image
        super().delete(*args, **kwargs)

        # Mettre à jour le stockage utilisé par l'utilisateur
        if self.user.storage_used >= round(size_mb):
            self.user.storage_used -= round(size_mb)
            self.user.save(update_fields=['storage_used'])
