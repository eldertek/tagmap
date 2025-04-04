from django.contrib.auth.models import AbstractUser
from django.db import models

class Utilisateur(AbstractUser):
    """
    Modèle d'utilisateur personnalisé avec gestion des rôles.
    Hérite de AbstractUser pour conserver les fonctionnalités de base de Django.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur'
        ENTREPRISE = 'ENTREPRISE', 'Entreprise'
        SALARIE = 'SALARIE', 'Salarie'
        VISITEUR = 'VISITEUR', 'Visiteur'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VISITEUR,
        verbose_name='Rôle'
    )

    entreprise = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': Role.ENTREPRISE},
        related_name='salaries',
        verbose_name='Entreprise associée'
    )

    salarie = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': Role.SALARIE},
        related_name='visiteurs',
        verbose_name='Salarie associé'
    )

    company_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Nom de l\'entreprise'
    )

    must_change_password = models.BooleanField(
        default=True,
        verbose_name='Doit changer de mot de passe'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Téléphone'
    )

    logo = models.ImageField(
        upload_to='logos/',
        blank=True,
        null=True,
        verbose_name='Logo'
    )

    storage_quota = models.PositiveIntegerField(
        default=50,  # 50 MB par défaut
        verbose_name='Quota de stockage (MB)',
        help_text='Quota de stockage en mégaoctets pour les photos des notes'
    )

    storage_used = models.PositiveIntegerField(
        default=0,
        verbose_name='Stockage utilisé (MB)',
        help_text='Espace de stockage actuellement utilisé en mégaoctets'
    )

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                name='unique_email'
            )
        ]

    def __str__(self):
        """Représentation string de l'utilisateur utilisant le format standard."""
        return self.get_display_name()

    def save(self, *args, **kwargs):
        # Si c'est un nouveau utilisateur (pas encore d'ID)
        if not self.pk:
            self.must_change_password = True
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_entreprise(self):
        return self.role == self.Role.ENTREPRISE

    @property
    def is_salarie(self):
        return self.role == self.Role.SALARIE

    @property
    def is_visiteur(self):
        return self.role == self.Role.VISITEUR

    def get_display_name(self):
        """Retourne le nom d'affichage standardisé de l'utilisateur."""
        full_name = f"{self.first_name} {self.last_name}".strip().upper()
        company = self.company_name or self.get_role_display()
        return f"{full_name} ({company})" if full_name else f"({company})"
