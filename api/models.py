from django.db import models

class ApplicationSetting(models.Model):
    """
    Modèle pour stocker les paramètres globaux de l'application.
    Chaque paramètre est identifié par une clé unique et peut avoir une valeur textuelle.
    Ce modèle est utilisé pour stocker des configurations côté serveur comme les clés d'API.
    """
    key = models.CharField(
        max_length=100, 
        unique=True, 
        verbose_name="Clé du paramètre",
        help_text="Identifiant unique du paramètre (ex: 'google_maps_api_key')"
    )
    value = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Valeur du paramètre",
        help_text="Valeur du paramètre (texte)"
    )
    description = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Description",
        help_text="Description de l'utilité du paramètre"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Date de création"
    )
    updated_at = models.DateTimeField(
        auto_now=True, 
        verbose_name="Date de modification"
    )
    
    class Meta:
        verbose_name = "Paramètre d'application"
        verbose_name_plural = "Paramètres d'application"
        
    def __str__(self):
        return f"{self.key}: {self.value[:30]}{'...' if len(self.value or '') > 30 else ''}" 