# Generated by Django 5.1.6 on 2025-04-05 07:06

import django.contrib.gis.db.models.fields
import django.db.models.deletion
import plans.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GeoNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(db_index=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("location", django.contrib.gis.db.models.fields.PointField(srid=4326)),
                (
                    "column",
                    models.CharField(
                        choices=[
                            ("1", "Idées"),
                            ("2", "À faire"),
                            ("3", "En cours"),
                            ("4", "Terminées"),
                            ("5", "Autres"),
                        ],
                        db_index=True,
                        default="1",
                        max_length=2,
                    ),
                ),
                (
                    "access_level",
                    models.CharField(
                        choices=[
                            ("private", "Privé"),
                            ("company", "Entreprise"),
                            ("employee", "Salariés"),
                            ("visitor", "Visiteurs"),
                        ],
                        db_index=True,
                        default="private",
                        max_length=10,
                    ),
                ),
                ("style", models.JSONField(default=dict)),
                ("order", models.IntegerField(db_index=True, default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                (
                    "category",
                    models.CharField(blank=True, db_index=True, max_length=50),
                ),
            ],
            options={
                "verbose_name": "Note géolocalisée",
                "verbose_name_plural": "Notes géolocalisées",
                "ordering": ["column", "order", "-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="NoteComment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("text", models.TextField(verbose_name="Texte du commentaire")),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, verbose_name="Date de création"
                    ),
                ),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="plans.geonote",
                        verbose_name="Note associée",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="note_comments",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Utilisateur",
                    ),
                ),
            ],
            options={
                "verbose_name": "Commentaire de note",
                "verbose_name_plural": "Commentaires de notes",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="NotePhoto",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        upload_to=plans.models.note_photo_upload_path,
                        verbose_name="Image",
                    ),
                ),
                (
                    "caption",
                    models.CharField(
                        blank=True, max_length=200, verbose_name="Légende"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, verbose_name="Date de création"
                    ),
                ),
                (
                    "size",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Taille de l'image en kilooctets",
                        verbose_name="Taille (KB)",
                    ),
                ),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="plans.geonote",
                        verbose_name="Note associée",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="note_photos",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Utilisateur",
                    ),
                ),
            ],
            options={
                "verbose_name": "Photo de note",
                "verbose_name_plural": "Photos de notes",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Plan",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nom", models.CharField(max_length=200, verbose_name="Nom du plan")),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="Description"),
                ),
                (
                    "date_creation",
                    models.DateTimeField(
                        auto_now_add=True, verbose_name="Date de création"
                    ),
                ),
                (
                    "date_modification",
                    models.DateTimeField(
                        auto_now=True, verbose_name="Dernière modification"
                    ),
                ),
                (
                    "preferences",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Stocke les préférences de dessin (type de trait, couleurs, etc.)",
                        verbose_name="Préférences de dessin",
                    ),
                ),
                (
                    "elements",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Stocke les éléments du plan (formes, connexions, etc.)",
                        verbose_name="Éléments du plan",
                    ),
                ),
                (
                    "historique",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Stocke l'historique des modifications du plan",
                        verbose_name="Historique des modifications",
                    ),
                ),
                (
                    "createur",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plans",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Créateur",
                    ),
                ),
                (
                    "entreprise",
                    models.ForeignKey(
                        blank=True,
                        limit_choices_to={"role": "ENTREPRISE"},
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="plans_entreprise",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Entreprise assignée",
                    ),
                ),
                (
                    "salarie",
                    models.ForeignKey(
                        blank=True,
                        limit_choices_to={"role": "SALARIE"},
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="plans_salarie",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Salarie assigné",
                    ),
                ),
                (
                    "visiteur",
                    models.ForeignKey(
                        blank=True,
                        limit_choices_to={"role": "VISITEUR"},
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="plans_visiteur",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Visiteur assigné",
                    ),
                ),
            ],
            options={
                "verbose_name": "Plan",
                "verbose_name_plural": "Plans",
                "ordering": ["-date_modification"],
            },
        ),
        migrations.AddField(
            model_name="geonote",
            name="plan",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="notes",
                to="plans.plan",
            ),
        ),
        migrations.CreateModel(
            name="FormeGeometrique",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "type_forme",
                    models.CharField(
                        choices=[
                            ("RECTANGLE", "Rectangle"),
                            ("CERCLE", "Cercle"),
                            ("DEMI_CERCLE", "Demi-cercle"),
                            ("LIGNE", "Ligne"),
                            ("TEXTE", "Texte"),
                        ],
                        max_length=20,
                        verbose_name="Type de forme",
                    ),
                ),
                (
                    "data",
                    models.JSONField(
                        blank=True, default=dict, verbose_name="Données de la forme"
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="formes",
                        to="plans.plan",
                        verbose_name="Plan associé",
                    ),
                ),
            ],
            options={
                "verbose_name": "Forme géométrique",
                "verbose_name_plural": "Formes géométriques",
            },
        ),
        migrations.CreateModel(
            name="Connexion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "geometrie",
                    django.contrib.gis.db.models.fields.LineStringField(
                        srid=4326, verbose_name="Géométrie de la connexion"
                    ),
                ),
                (
                    "forme_destination",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="connexions_entrantes",
                        to="plans.formegeometrique",
                        verbose_name="Forme destination",
                    ),
                ),
                (
                    "forme_source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="connexions_sortantes",
                        to="plans.formegeometrique",
                        verbose_name="Forme source",
                    ),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="connexions",
                        to="plans.plan",
                        verbose_name="Plan associé",
                    ),
                ),
            ],
            options={
                "verbose_name": "Connexion",
                "verbose_name_plural": "Connexions",
            },
        ),
        migrations.CreateModel(
            name="TexteAnnotation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("texte", models.CharField(max_length=500, verbose_name="Texte")),
                (
                    "position",
                    django.contrib.gis.db.models.fields.PointField(
                        srid=4326, verbose_name="Position"
                    ),
                ),
                (
                    "rotation",
                    models.FloatField(default=0, verbose_name="Rotation (degrés)"),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="annotations",
                        to="plans.plan",
                        verbose_name="Plan associé",
                    ),
                ),
            ],
            options={
                "verbose_name": "Texte d'annotation",
                "verbose_name_plural": "Textes d'annotation",
            },
        ),
        migrations.AddIndex(
            model_name="geonote",
            index=models.Index(
                fields=["plan", "column", "order"],
                name="plans_geono_plan_id_a12d78_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="geonote",
            index=models.Index(
                fields=["plan", "access_level"], name="plans_geono_plan_id_0c6989_idx"
            ),
        ),
    ]
