import * as L from 'leaflet';
import { NoteAccessLevel } from '../stores/notes';
import type { DrawingElementType, NoteData } from '../types/drawing';
import { noteService } from '../services/api';
import { useNotesStore } from '../stores/notes';
import { useNotificationStore } from '../stores/notification';

// Interface pour les options de création d'une GeoNote
export interface GeoNoteOptions extends L.MarkerOptions {
  name?: string;
  description?: string;
  columnId?: string;
  accessLevel?: NoteAccessLevel;
  category?: string;
  color?: string;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
  radius?: number;
}

export class GeoNote extends L.Marker {
  properties: {
    type: string;
    name: string;
    description: string;
    columnId: string;
    style: any;
    [key: string]: any;
  };

  // Propriété pour suivre si la note a été sauvegardée avec le plan
  private _planSaved: boolean = false;

  // Propriété pour suivre si la note est en cours de déplacement
  private _isMoving: boolean = false;

  // Déclaration de la méthode _animateZoom avec initialisation
  private _animateZoom: (e: any) => void = () => {};

  constructor(latlng: L.LatLngExpression, options: GeoNoteOptions = {}) {
    // Créer une icône personnalisée pour le marqueur
    const color = options.color || '#2b6451';
    const iconHtml = `
      <div class="geo-note-marker">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" fill="${color}" />
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'geo-note-icon',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      // popupAnchor: [0, -36] // Commenté : Configuration du popup
    });

    // Ajouter du CSS pour s'assurer que l'icône est correctement positionnée
    if (!document.getElementById('geo-note-style')) {
      const style = document.createElement('style');
      style.id = 'geo-note-style';
      style.textContent = `
        .geo-note-icon {
          background: none !important;
          border: none !important;
        }
        .geo-note-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          transform-origin: center bottom;
        }
      `;
      document.head.appendChild(style);
    }

    // Options par défaut pour un marqueur
    const defaultOptions: L.MarkerOptions = {
      icon: icon,
      draggable: false,
      autoPan: true,
      // Ajouter des options pour améliorer la stabilité du rendu
      riseOnHover: true,
      bubblingMouseEvents: false,
      interactive: true,
      keyboard: false
    };

    super(latlng, defaultOptions);

    // Initialiser les propriétés
    this.properties = {
      type: 'Note',
      name: options.name || 'Note géolocalisée',
      description: options.description || '',
      columnId: options.columnId || '1', // Colonne 'Idées' par défaut
      accessLevel: options.accessLevel || NoteAccessLevel.PRIVATE, // Niveau d'accès par défaut
      category: options.category || 'forages', // Catégorie par défaut
      style: {
        color: options.color || '#2b6451',
        weight: options.weight || 2,
        fillColor: options.fillColor || '#2b6451',
        fillOpacity: options.fillOpacity !== undefined ? options.fillOpacity : 0.8,
        radius: options.radius || 12
      },
      comments: [],
      photos: [],
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[GeoNote][constructor] Note créée avec columnId:', this.properties.columnId);

    // Commenté : Ajout du popup pour afficher la description
    // this.bindPopup(this.createPopupContent());

    // Ajouter un gestionnaire d'événements pour le double-clic
    this.on('dblclick', this.onDoubleClick);

    // Ajouter des écouteurs pour les événements de carte
    this.on('add', (e: any) => {
      if (e.target && e.target._map) {
        // Quand la note est ajoutée à la carte, ajouter des écouteurs pour les événements de zoom et de déplacement
        const map = e.target._map;

        // Protéger contre les erreurs d'animation de zoom
        this._protectFromZoomAnimationErrors(map);

        // Ajouter des écouteurs pour rafraîchir l'icône après les événements de carte
        map.on('zoomend', () => {
          // Mettre à jour la position après la fin de l'animation de zoom
          this.updatePosition();
          // Rafraîchir le style de l'icône
          this.refreshIconStyle();
        });
        map.on('moveend', () => {
          // Mettre à jour la position après la fin du déplacement
          this.updatePosition();
          // Rafraîchir le style de l'icône
          this.refreshIconStyle();
        });
      }
    });

    // Ajouter un écouteur pour la mise à jour du style
    window.addEventListener('geonote:updateStyle', ((e: CustomEvent) => {
      const eventNoteId = e.detail.noteId;
      const backendId = (this as any)._dbId || this.properties.id;

      console.log('[GeoNote][updateStyle] Événement reçu pour noteId:', eventNoteId,
                  'Comparaison avec ID backend:', backendId);

      // Vérifier si l'ID dans l'événement correspond à l'ID backend
      if (eventNoteId === backendId) {
        console.log('[GeoNote][updateStyle] Correspondance trouvée, mise à jour du style:', e.detail.style);
        this.setNoteStyle(e.detail.style);

        // Mettre à jour les propriétés de la note
        if (this.properties && this.properties.style) {
          this.properties.style = {
            ...this.properties.style,
            ...e.detail.style
          };
        }

        // Mettre à jour le popup pour refléter les changements
        // this.bindPopup(this.createPopupContent());
      }
    }) as EventListener);

    // Ajouter un écouteur pour la mise à jour complète des propriétés
    window.addEventListener('geonote:update', ((e: CustomEvent) => {
      const eventNoteId = e.detail.noteId;
      const backendId = (this as any)._dbId || this.properties.id;

      console.log('[GeoNote][update] Événement reçu pour noteId:', eventNoteId,
                  'Comparaison avec ID backend:', backendId);

      // Vérifier si l'ID dans l'événement correspond à l'ID backend
      if (eventNoteId === backendId) {
        console.log('[GeoNote][update] Correspondance trouvée, mise à jour des propriétés:', e.detail.properties);

        // Mettre à jour toutes les propriétés
        this.properties = {
          ...this.properties,
          name: e.detail.properties.name,
          description: e.detail.properties.description,
          columnId: e.detail.properties.columnId,
          accessLevel: e.detail.properties.accessLevel,
          style: e.detail.properties.style
        };

        // Mettre à jour le style visuel
        this.setNoteStyle(e.detail.properties.style);

        // Mettre à jour le popup pour refléter les changements
        // this.bindPopup(this.createPopupContent());

        console.log('[GeoNote][update] Propriétés mises à jour:', this.properties);
      }
    }) as EventListener);

    console.log('[GeoNote][constructor] Note créée:', {
      location: latlng,
      name: this.properties.name,
      type: this.properties.type,
      style: this.properties.style
    });
  }

  // Commenté : Méthode pour créer le contenu du popup
  /*
  createPopupContent(): HTMLElement {
    // ... code de création du popup ...
  }
  */

  // Obtenir la couleur de la colonne en fonction de son ID
  getColumnColor(columnId: string): string {
    const colors: Record<string, string> = {
      '1': '#8B5CF6', // Idées
      '2': '#F59E0B', // À faire
      '3': '#3B82F6', // En cours
      '4': '#10B981', // Terminées
      '5': '#6B7280'  // Autres
    };
    return colors[columnId] || '#6B7280';
  }

  // Obtenir le nom de la colonne en fonction de son ID
  getColumnLabel(columnId: string): string {
    const labels: Record<string, string> = {
      '1': 'Idées',
      '2': 'À faire',
      '3': 'En cours',
      '4': 'Terminées',
      '5': 'Autres'
    };
    return labels[columnId] || 'Colonne ' + columnId;
  }

  // Obtenir le libellé du niveau d'accès
  getAccessLevelLabel(level: NoteAccessLevel): string {
    switch (level) {
      case NoteAccessLevel.PRIVATE:
        return 'Privé';
      case NoteAccessLevel.COMPANY:
        return 'Entreprise';
      case NoteAccessLevel.EMPLOYEE:
        return 'Salariés';
      case NoteAccessLevel.VISITOR:
        return 'Visiteurs';
      default:
        return 'Inconnu';
    }
  }

  // Obtenir la couleur du niveau d'accès
  getAccessLevelColor(level: NoteAccessLevel): string {
    switch (level) {
      case NoteAccessLevel.PRIVATE:
        return '#9CA3AF'; // Gris
      case NoteAccessLevel.COMPANY:
        return '#EF4444'; // Rouge - pour l'entreprise uniquement
      case NoteAccessLevel.EMPLOYEE:
        return '#F59E0B'; // Orange - pour l'entreprise et salariés
      case NoteAccessLevel.VISITOR:
        return '#10B981'; // Vert - pour tous
      default:
        return '#6B7280';
    }
  }

  // Gestionnaire d'événements pour le double-clic
  onDoubleClick(e: L.LeafletMouseEvent): void {
    L.DomEvent.stopPropagation(e);
    this.editNote();
  }

  // Méthode pour éditer la note
  editNote(): void {
    // Commenté : Fermeture du popup
    // this.closePopup();

    // Utiliser l'ID du backend s'il existe, sinon utiliser l'ID Leaflet
    // Priorité: _dbId (ID de la base de données), puis properties.id, puis _leaflet_id
    const noteId = (this as any)._dbId || this.properties.id || (this as any)._leaflet_id;

    console.log(`[GeoNote][editNote] Édition de note - ID backend: ${(this as any)._dbId}, ID properties: ${this.properties.id}, ID Leaflet: ${(this as any)._leaflet_id}, ID utilisé: ${noteId}`);

    // Créer un objet note à partir des propriétés
    const note = {
      id: noteId,
      title: this.properties.name,
      description: this.properties.description,
      location: {
        type: 'Point',
        coordinates: [this.getLatLng().lng, this.getLatLng().lat] // [longitude, latitude] pour GeoJSON
      },
      columnId: this.properties.columnId || '1', // Colonne 'Idées' par défaut
      accessLevel: this.properties.accessLevel || 'company', // Valeur par défaut
      style: this.properties.style || {
        color: '#2b6451',
        weight: 2,
        opacity: 1,
        fillColor: '#2b6451',
        fillOpacity: 0.6,
        radius: 8
      },
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: this.properties.comments || [],
      photos: this.properties.photos || []
    };

    console.log('[GeoNote][editNote] Édition de note avec columnId:', note.columnId);

    // Émettre un événement pour ouvrir le modal d'édition
    console.log('[GeoNote] Émission de l\'événement note:edit avec', note);

    // Utiliser un événement personnalisé global pour éviter les problèmes avec Leaflet
    // Inclure la référence à cette couche Leaflet pour permettre de retrouver le dbId
    // S'assurer que l'ID backend est correctement transmis
    const event = new CustomEvent('geonote:edit', {
      detail: {
        note,
        source: this,
        backendId: (this as any)._dbId // Transmettre explicitement l'ID backend
      }
    });
    window.dispatchEvent(event);

    // Également émettre l'événement Leaflet standard (pour compatibilité)
    this.fire('note:edit', { note, source: this, backendId: (this as any)._dbId });
  }

  // Méthode pour ouvrir Google Maps avec itinéraire
  openInGoogleMaps(): void {
    // Commenté : Fermeture du popup
    // this.closePopup();

    // Récupérer les coordonnées de la note
    const lat = this.getLatLng().lat;
    const lng = this.getLatLng().lng;

    // Construire l'URL Google Maps pour l'itinéraire
    // L'origine sera la position actuelle de l'utilisateur (laissée vide pour que Google l'utilise automatiquement)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Ouvrir l'URL dans un nouvel onglet
    window.open(url, '_blank');
  }

  // Mettre à jour les propriétés
  updateProperties(): void {
    // S'assurer que le type est correctement défini
    this.properties.type = 'Note';

    // S'assurer que la catégorie est définie
    if (!this.properties.category) {
      this.properties.category = 'forages';
    }

    // S'assurer que le niveau d'accès est défini
    if (!this.properties.accessLevel) {
      this.properties.accessLevel = NoteAccessLevel.PRIVATE;
    }

    // Conserver les propriétés existantes du style si elles existent
    const existingStyle = this.properties.style || {};

    // Priorité pour la couleur :
    // 1. Utiliser la couleur existante dans le style si elle existe
    // 2. Sinon, essayer de récupérer la couleur de l'icône SVG
    // 3. Sinon, utiliser la couleur par défaut
    let color = existingStyle.color || existingStyle.fillColor;

    // Si aucune couleur n'est définie dans le style, essayer de la récupérer depuis l'icône SVG
    if (!color) {
      const svgPath = this.getElement()?.querySelector('.geo-note-marker svg path');
      if (svgPath) {
        const fillColor = svgPath.getAttribute('fill');
        if (fillColor) {
          color = fillColor;
          console.log('[GeoNote][updateProperties] Couleur récupérée depuis SVG:', color);
        }
      }
    }

    // Si toujours pas de couleur, utiliser la couleur par défaut
    if (!color) {
      color = '#2b6451';
      console.log('[GeoNote][updateProperties] Utilisation de la couleur par défaut:', color);
    }

    console.log('[GeoNote][updateProperties] Couleur finale utilisée:', color);

    // Conserver le radius existant s'il existe
    const existingRadius = existingStyle.radius || 12;

    this.properties.style = {
      ...existingStyle,
      color: color,
      weight: existingStyle.weight || 2,
      fillColor: color,
      fillOpacity: existingStyle.fillOpacity || 0.8,
      radius: existingRadius,
      // Stocker explicitement la catégorie et le niveau d'accès dans le style
      _accessLevel: this.properties.accessLevel,
      accessLevel: this.properties.accessLevel,
      category: this.properties.category
    };

    console.log('[GeoNote][updateProperties] Style mis à jour:', this.properties.style);

    // Mettre à jour le popup pour refléter les changements
    // this.bindPopup(this.createPopupContent());
  }

  // Méthode pour mettre à jour le style
  setNoteStyle(style: any): void {
    console.log('[GeoNote][setNoteStyle] Mise à jour du style:', style);

    // S'assurer que nous avons des valeurs pour color et fillColor
    const color = style.color || style.fillColor || '#2b6451';
    const fillColor = style.fillColor || style.color || '#2b6451';

    console.log('[GeoNote][setNoteStyle] Nouvelles couleurs - stroke:', color, 'fill:', fillColor);

    // Au lieu de remplacer l'icône entière, mettons à jour la couleur de l'icône existante
    // pour éviter les problèmes pendant l'animation de zoom
    const element = this.getElement();
    if (element) {
      try {
        // Trouver le path SVG et mettre à jour sa couleur
        const svgPath = element.querySelector('svg path');
        if (svgPath) {
          svgPath.setAttribute('fill', fillColor);
          console.log('[GeoNote][setNoteStyle] Couleur mise à jour directement sur le SVG existant');
        } else {
          console.warn('[GeoNote][setNoteStyle] Impossible de trouver le path SVG dans l\'élément');
          // Fallback: créer une nouvelle icône
          this._updateIconWithNewColor(fillColor);
        }
      } catch (e) {
        console.warn('[GeoNote][setNoteStyle] Erreur lors de la mise à jour directe du SVG:', e);
        // Fallback: créer une nouvelle icône
        this._updateIconWithNewColor(fillColor);
      }
    } else {
      // Si l'élément n'existe pas encore, mettre à jour les propriétés pour une utilisation ultérieure
      this._updateIconWithNewColor(fillColor);
    }

    // Récupérer les propriétés accessLevel et category depuis le style si disponibles
    const accessLevel = style._accessLevel || style.accessLevel || this.properties.accessLevel;
    const category = style.category || this.properties.category;

    // S'assurer que le style dans les propriétés est à jour
    if (this.properties && this.properties.style) {
      this.properties.style = {
        ...this.properties.style,
        color: color,
        weight: style.weight || this.properties.style.weight || 2,
        fillColor: fillColor,
        fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : this.properties.style.fillOpacity || 0.8,
        radius: style.radius || this.properties.style.radius || 12,
        // Préserver les propriétés importantes dans le style
        _accessLevel: accessLevel,
        accessLevel: accessLevel,
        category: category
      };
    }

    // Mettre à jour les propriétés principales également
    if (accessLevel) {
      if (this.properties.accessLevel !== accessLevel) {
        this.properties.accessLevel = accessLevel;
        console.log('[GeoNote][setNoteStyle] Niveau d\'accès mis à jour:', accessLevel);
      }
    }

    if (category) {
      if (this.properties.category !== category) {
        this.properties.category = category;
        console.log('[GeoNote][setNoteStyle] Catégorie mise à jour:', category);
      }
    }

    // Forcer un rafraîchissement de l'icône
    this.refreshIconStyle();

    // Toujours mettre à jour le popup pour s'assurer que les changements sont reflétés
    // même si les propriétés n'ont pas changé (pour résoudre le problème de mise à jour multiple)
    console.log('[GeoNote][setNoteStyle] Mise à jour du popup');
    // this.bindPopup(this.createPopupContent());
  }

  // Méthode pour forcer le rafraîchissement de l'icône
  private refreshIconStyle(): void {
    const element = this.getElement();
    if (element) {
      // Forcer un reflow pour réinitialiser le rendu
      element.style.display = 'none';
      void element.offsetHeight;
      element.style.display = '';

      // Réinitialiser les transformations CSS qui pourraient avoir été appliquées
      // pendant l'animation de zoom
      L.DomUtil.setTransform(element, new L.Point(0, 0), 1);

      // S'assurer que l'icône est correctement positionnée
      if (this._map) {
        try {
          // Forcer une mise à jour de la position
          const pos = this._map.latLngToLayerPoint(this.getLatLng());
          L.DomUtil.setPosition(element, pos);

          // S'assurer que l'icône est visible
          element.style.opacity = '1';
          element.style.transition = 'opacity 0.2s';
        } catch (e) {
          console.warn('[GeoNote][refreshIconStyle] Erreur lors de la mise à jour de la position:', e);
        }
      }
    }
  }

  // Méthode pour protéger contre les erreurs d'animation de zoom
  private _protectFromZoomAnimationErrors(map: L.Map): void {
    try {
      // Remplacer la méthode _animateZoom du marqueur pour éviter les erreurs
      const originalAnimateZoom = this._animateZoom;

      this._animateZoom = function(e: any) {
        try {
          // Vérifier que toutes les propriétés nécessaires existent
          if (!this._map || !e.center || !e.zoom) {
            console.warn('[GeoNote][_animateZoom] Animation de zoom ignorée: propriétés manquantes');
            return;
          }

          // Au lieu d'appeler la méthode originale, utiliser notre méthode personnalisée
          // qui gère mieux les animations de zoom
          if (typeof this.updatePositionDuringZoom === 'function') {
            this.updatePositionDuringZoom(e);
          } else {
            // Fallback sur la méthode originale si notre méthode n'est pas disponible
            originalAnimateZoom.call(this, e);
          }
        } catch (error) {
          console.warn('[GeoNote][_animateZoom] Erreur lors de l\'animation de zoom:', error);
          // En cas d'erreur, essayer de réinitialiser la position
          try {
            const element = this.getElement();
            if (element && this._map) {
              const pos = this._map.latLngToLayerPoint(this.getLatLng());
              L.DomUtil.setPosition(element, pos);
            }
          } catch (e) {
            console.error('[GeoNote][_animateZoom] Erreur lors de la récupération:', e);
          }
        }
      };

      // Ajouter un écouteur pour l'événement zoomanim de la carte
      map.on('zoomanim', (e: any) => {
        // Utiliser directement notre méthode personnalisée
        this.updatePositionDuringZoom(e);
      });

      console.log('[GeoNote][_protectFromZoomAnimationErrors] Protection contre les erreurs d\'animation de zoom activée');
    } catch (e) {
      console.error('[GeoNote][_protectFromZoomAnimationErrors] Erreur lors de la mise en place de la protection:', e);
    }
  }

  // Méthode privée pour mettre à jour l'icône avec une nouvelle couleur
  private _updateIconWithNewColor(fillColor: string): void {
    try {
      // Désactiver temporairement les animations pour éviter les problèmes
      const map = this._map;
      let zoomAnimationWasEnabled = false;

      if (map) {
        zoomAnimationWasEnabled = map.options.zoomAnimation || false;
        map.options.zoomAnimation = false;
      }

      // Créer une nouvelle icône avec le SVG coloré
      const iconHtml = `
        <div class="geo-note-marker">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" fill="${fillColor}" />
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'geo-note-icon',
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36]
      });

      // Mettre à jour l'icône
      this.setIcon(icon);

      // Réactiver les animations après un court délai
      if (map && zoomAnimationWasEnabled) {
        setTimeout(() => {
          map.options.zoomAnimation = true;
        }, 100);
      }

      console.log('[GeoNote][_updateIconWithNewColor] Icône mise à jour avec la nouvelle couleur');
    } catch (e) {
      console.error('[GeoNote][_updateIconWithNewColor] Erreur lors de la mise à jour de l\'icône:', e);
    }
  }

  // Convertir la note en format compatible avec le backend
  toBackendFormat(elementId?: number): { id?: number, type_forme: DrawingElementType, data: NoteData } {
    // Mettre à jour les propriétés pour s'assurer qu'elles sont à jour
    this.updateProperties();

    // Récupérer les coordonnées
    const latlng = this.getLatLng();

    // S'assurer que le style contient le radius
    const style = {
      ...this.properties.style,
      radius: (this.properties.style as any).radius || 12
    };

    // Ajouter le niveau d'accès dans le style pour s'assurer qu'il est sauvegardé
    const styleWithAccessLevel = {
      ...style,
      _accessLevel: this.properties.accessLevel, // Stocker le niveau d'accès dans le style
      accessLevel: this.properties.accessLevel // Stocker aussi le niveau d'accès directement
    };

    // S'assurer que columnId est défini et vaut '1' (Idées) par défaut
    const columnId = this.properties.columnId || '1';
    console.log('[GeoNote][toBackendFormat] Sauvegarde de note avec columnId:', columnId);

    // Créer l'objet de données pour le backend
    return {
      id: elementId,
      type_forme: 'Note',
      data: {
        // Utiliser le format GeoJSON attendu par GeoDjango
        location: {
          type: 'Point',
          coordinates: [latlng.lng, latlng.lat] // Ordre important: longitude, latitude
        },
        name: this.properties.name,
        description: this.properties.description,
        columnId: columnId, // Utiliser la colonne 'Idées' par défaut si non spécifié
        accessLevel: this.properties.accessLevel,
        category: this.properties.category || 'forages',
        style: styleWithAccessLevel,
        comments: this.properties.comments || [],
        photos: this.properties.photos || [],
        order: this.properties.order || 0,
        createdAt: this.properties.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  // Mettre à jour les propriétés de la note à partir des données du backend
  updateFromBackendData(data: NoteData): void {
    console.log('[GeoNote][updateFromBackendData] Début de la mise à jour avec les données:', data);
    console.log('[GeoNote][updateFromBackendData] Couleur dans les données reçues:', {
      styleColor: data.style?.color,
      styleFillColor: data.style?.fillColor,
      styleObject: data.style
    });

    // S'assurer que le type est correctement défini
    this.properties.type = 'Note';

    // S'assurer que le style contient le radius
    const style = data.style ? {
      ...data.style,
      radius: (data.style as any).radius || 12
    } : this.properties.style;

    console.log('[GeoNote][updateFromBackendData] Style après traitement initial:', style);

    // Récupérer le niveau d'accès depuis le style si disponible
    const accessLevel = (data.style as any)?._accessLevel || (data.style as any)?.accessLevel || data.accessLevel || this.properties.accessLevel || NoteAccessLevel.PRIVATE;
    console.log('[GeoNote][updateFromBackendData] Niveau d\'accès récupéré:', accessLevel);

    // Récupérer la catégorie depuis le style si disponible
    const category = (data.style as any)?.category || data.category || this.properties.category || 'forages';
    console.log('[GeoNote][updateFromBackendData] Catégorie récupérée:', category);

    // S'assurer que columnId est défini et vaut '1' (Idées) par défaut
    const columnId = data.columnId || this.properties.columnId || '1';
    console.log('[GeoNote][updateFromBackendData] Mise à jour de note avec columnId:', columnId);

    // S'assurer que le style contient le niveau d'accès et la catégorie
    const styleWithMetadata = {
      ...style,
      _accessLevel: accessLevel,
      accessLevel: accessLevel,
      category: category
    };

    // Mettre à jour les propriétés
    this.properties = {
      ...this.properties,
      name: data.name || this.properties.name,
      description: data.description || this.properties.description,
      columnId: columnId, // Utiliser la colonne 'Idées' par défaut si non spécifié
      accessLevel: accessLevel,
      category: category,
      style: styleWithMetadata,
      comments: data.comments || this.properties.comments || [],
      photos: data.photos || this.properties.photos || [],
      order: data.order || this.properties.order || 0,
      createdAt: data.createdAt || this.properties.createdAt,
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Mettre à jour le style visuel avec le style contenant les métadonnées
    this.setNoteStyle(styleWithMetadata);

    // Mettre à jour le popup
    // this.bindPopup(this.createPopupContent());

    console.log('[GeoNote][updateFromBackendData] Note mise à jour:', {
      name: this.properties.name,
      type: this.properties.type,
      category: this.properties.category,
      accessLevel: this.properties.accessLevel,
      style: this.properties.style
    });
  }

  // Méthode statique pour créer une GeoNote à partir des données du backend
  static fromBackendData(data: NoteData): GeoNote {
    // Variable pour stocker les coordonnées au format [lat, lng] pour Leaflet
    let latLng: [number, number];

    // Traiter différents formats de localisation
    if (typeof data.location === 'object' && !Array.isArray(data.location) && data.location.type === 'Point') {
      // Format GeoJSON: { type: 'Point', coordinates: [lng, lat] }
      const coords = data.location.coordinates;
      console.log('[GeoNote][fromBackendData] Coordonnées GeoJSON reçues:', coords);

      // Convertir du format GeoJSON [lng, lat] au format Leaflet [lat, lng]
      latLng = [coords[1], coords[0]];
    } else if (Array.isArray(data.location) && data.location.length === 2) {
      // Format tableau [lat, lng]
      latLng = data.location as [number, number];
    } else {
      throw new Error('Les données de la note ne contiennent pas de position valide');
    }

    console.log('[GeoNote][fromBackendData] Création d\'une note à partir des données:', data);
    console.log('[GeoNote][fromBackendData] Position utilisée:', latLng);

    // Récupérer le niveau d'accès depuis le style si disponible
    const accessLevel = (data.style as any)?._accessLevel || (data.style as any)?.accessLevel || data.accessLevel || NoteAccessLevel.PRIVATE;
    console.log('[GeoNote][fromBackendData] Niveau d\'accès récupéré:', accessLevel, 'Style:', data.style);

    // Récupérer la catégorie depuis le style si disponible
    const category = (data.style as any)?.category || data.category || 'forages';
    console.log('[GeoNote][fromBackendData] Catégorie récupérée:', category);

    // Forcer la mise à jour du niveau d'accès et de la catégorie dans les données
    data.accessLevel = accessLevel;
    data.category = category;

    // S'assurer que columnId est défini et vaut '1' (Idées) par défaut
    const columnId = data.columnId || '1';
    console.log('[GeoNote][fromBackendData] Création de note avec columnId:', columnId);

    // Créer une nouvelle instance de GeoNote avec les coordonnées au format Leaflet
    const note = new GeoNote(latLng, {
      name: data.name,
      description: data.description,
      columnId: columnId, // Utiliser la colonne 'Idées' par défaut si non spécifié
      accessLevel: accessLevel as NoteAccessLevel,
      category: data.category || 'forages',
      color: data.style?.color,
      weight: data.style?.weight,
      fillColor: data.style?.fillColor,
      fillOpacity: data.style?.fillOpacity,
      radius: (data.style as any)?.radius
    });

    // S'assurer que le type est correctement défini
    note.properties.type = 'Note';

    // Ajouter les propriétés supplémentaires
    note.properties.comments = data.comments || [];
    note.properties.photos = data.photos || [];
    note.properties.order = data.order || 0;
    note.properties.createdAt = data.createdAt || new Date().toISOString();
    note.properties.updatedAt = data.updatedAt || new Date().toISOString();

    // Mettre à jour le style visuel
    if (data.style) {
      note.setNoteStyle(data.style);
    }

    // Mettre à jour le popup
    // note.bindPopup(note.createPopupContent());

    console.log('[GeoNote][fromBackendData] Note créée:', {
      location: latLng,
      name: note.properties.name,
      type: note.properties.type,
      category: note.properties.category,
      accessLevel: note.properties.accessLevel,
      style: note.properties.style
    });

    // Retourner la note créée
    return note;
  }

  // Méthode pour sauvegarder la note directement via l'API
  async saveNote(planId?: number): Promise<number> {
    // Éviter les sauvegardes multiples
    if (this._planSaved) return (this as any)._dbId || 0;

    console.log('[GeoNote][saveNote] Sauvegarde directe de la note via l\'API');

    try {
      // Mettre à jour les propriétés pour s'assurer qu'elles sont à jour
      this.updateProperties();

      // Log de la couleur avant la sauvegarde
      console.log('[GeoNote][saveNote] Couleur avant sauvegarde:', {
        styleColor: this.properties.style?.color,
        styleFillColor: this.properties.style?.fillColor,
        iconColor: this.getElement()?.querySelector('.geo-note-marker svg path')?.getAttribute('fill') || 'non disponible'
      });

      // S'assurer que le style contient le niveau d'accès, la catégorie et la couleur correcte
      // Vérifier si la couleur est au format rgb et la convertir en hex si nécessaire
      let color = this.properties.style?.color || '#2b6451';

      // Si la couleur est au format rgb, essayer de récupérer la couleur depuis l'icône SVG
      if (color.startsWith('rgb')) {
        const svgPath = this.getElement()?.querySelector('.geo-note-marker svg path');
        if (svgPath) {
          const fillColor = svgPath.getAttribute('fill');
          if (fillColor) {
            color = fillColor;
            console.log('[GeoNote][saveNote] Couleur récupérée depuis SVG pour remplacer RGB:', color);
          }
        }
      }

      const styleWithMetadata = {
        ...this.properties.style,
        color: color,
        fillColor: color,
        _accessLevel: this.properties.accessLevel,
        accessLevel: this.properties.accessLevel,
        category: this.properties.category
      };

      console.log('[GeoNote][saveNote] Style final pour l\'envoi:', styleWithMetadata);

      // Préparer les données pour l'envoi
      const noteData: any = {
        title: this.properties.name,
        description: this.properties.description,
        location: {
          type: 'Point',
          coordinates: [this.getLatLng().lng, this.getLatLng().lat] // [longitude, latitude] pour GeoJSON
        },
        column: this.properties.columnId || '1', // Utiliser la colonne 'Idées' par défaut
        access_level: this.properties.accessLevel || 'company', // Valeur par défaut
        style: styleWithMetadata,
        category: this.properties.category || 'forages',
        comments: this.properties.comments || [],
        photos: this.properties.photos || []
      };

      // Si un ID de plan est fourni, l'associer à la note
      if (planId) {
        noteData.plan = planId;
      }

      console.log('[GeoNote][saveNote] Données à envoyer:', noteData);
      console.log('[GeoNote][saveNote] Couleur dans les données envoyées:', {
        styleColor: noteData.style.color,
        styleFillColor: noteData.style.fillColor
      });

      let savedNote;

      if ((this as any)._dbId) {
        // Mise à jour d'une note existante
        const response = await noteService.updateNote((this as any)._dbId, noteData);
        savedNote = response.data;
        console.log('[GeoNote][saveNote] Note mise à jour avec succès:', savedNote);
        console.log('[GeoNote][saveNote] Couleur dans la réponse du backend (update):', {
          styleColor: savedNote.style?.color,
          styleFillColor: savedNote.style?.fillColor,
          styleObject: savedNote.style
        });

        // Forcer la mise à jour du popup après la sauvegarde
        // this.bindPopup(this.createPopupContent());
      } else {
        // Création d'une nouvelle note
        const response = await noteService.createNote(noteData);
        savedNote = response.data;
        console.log('[GeoNote][saveNote] Note créée avec succès:', savedNote);
        console.log('[GeoNote][saveNote] Couleur dans la réponse du backend (create):', {
          styleColor: savedNote.style?.color,
          styleFillColor: savedNote.style?.fillColor,
          styleObject: savedNote.style
        });

        // Forcer la mise à jour du popup après la sauvegarde
        // this.bindPopup(this.createPopupContent());

        // Stocker l'ID de la base de données pour les futures mises à jour
        (this as any)._dbId = savedNote.id;

        // Ajouter la note au store
        const notesStore = useNotesStore();
        notesStore.addNote({
          ...savedNote,
          id: savedNote.id,
          columnId: savedNote.column,
          accessLevel: savedNote.access_level
        });
      }

      // Marquer la note comme sauvegardée
      this._planSaved = true;

      return savedNote.id;
    } catch (error) {
      console.error('[GeoNote][saveNote] Erreur lors de la sauvegarde de la note:', error);
      const notificationStore = useNotificationStore();
      notificationStore.error('Erreur lors de la sauvegarde de la note');
      return 0;
    }
  }

  // Méthode pour déclencher la sauvegarde du plan (maintenue pour compatibilité)
  triggerPlanSave(): void {
    // Récupérer l'ID du plan courant depuis le localStorage
    const currentPlanId = localStorage.getItem('lastPlanId');

    // Sauvegarder la note directement via l'API en associant au plan courant
    if (currentPlanId) {
      console.log(`[GeoNote][triggerPlanSave] Sauvegarde de la note avec le plan ${currentPlanId}`);
      this.saveNote(parseInt(currentPlanId));
    } else {
      console.log('[GeoNote][triggerPlanSave] Aucun plan courant, sauvegarde sans association');
      this.saveNote();
    }

    // Émettre un événement pour déclencher la sauvegarde du plan (pour compatibilité)
    const event = new CustomEvent('geonote:savePlan');
    window.dispatchEvent(event);
  }

  // Méthode pour réinitialiser l'état de sauvegarde du plan
  resetPlanSaveState(): void {
    this._planSaved = false;
  }

  // Méthode pour déplacer la note vers une nouvelle position
  moveTo(newLatLng: L.LatLng): void {
    // Mettre à jour la position de la note
    this.setLatLng(newLatLng);

    // Émettre un événement pour notifier du déplacement
    this.fire('note:moved', {
      latlng: newLatLng,
      note: this
    });

    // Commenté : Mise à jour du popup
    // this.bindPopup(this.createPopupContent());

    // Déclencher la sauvegarde du plan
    this.triggerPlanSave();
  }

  // Méthode pour commencer le déplacement
  startMoving(): void {
    this._isMoving = true;
    // Commenté : Fermeture du popup pendant le déplacement
    // this.closePopup();
    // Émettre un événement pour notifier du début du déplacement
    this.fire('note:movestart', {
      latlng: this.getLatLng(),
      note: this
    });
  }

  // Méthode pour terminer le déplacement
  finishMoving(): void {
    this._isMoving = false;
    // Émettre un événement pour notifier de la fin du déplacement
    this.fire('note:moveend', {
      latlng: this.getLatLng(),
      note: this
    });
    // Déclencher la sauvegarde du plan
    this.triggerPlanSave();
  }

  // Méthode pour vérifier si la note est en cours de déplacement
  isMoving(): boolean {
    return this._isMoving;
  }

  // Méthode pour gérer l'animation de zoom en masquant temporairement le marqueur
  updatePositionDuringZoom(e: any): void {
    try {
      if (!this._map || !e.center || e.zoom === undefined) {
        return;
      }

      // Récupérer l'élément DOM du marqueur
      const element = this.getElement();
      if (!element) {
        return;
      }

      // Masquer simplement l'élément pendant l'animation de zoom
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.01s';
    } catch (error) {
      console.warn('[GeoNote][updatePositionDuringZoom] Erreur lors de la gestion de l\'animation de zoom:', error);
    }
  }

  // Méthode pour mettre à jour la position après un zoom ou un déplacement
  updatePosition(): void {
    try {
      if (!this._map) {
        return;
      }

      // Récupérer l'élément DOM du marqueur
      const element = this.getElement();
      if (!element) {
        return;
      }

      // Calculer la position en pixels
      const position = this._map.latLngToLayerPoint(this.getLatLng());

      // Appliquer la position directement à l'élément DOM
      L.DomUtil.setPosition(element, position);

      // Réafficher le marqueur avec une transition douce
      element.style.opacity = '1';
      element.style.transition = 'opacity 0.2s';
    } catch (error) {
      console.warn('[GeoNote][updatePosition] Erreur lors de la mise à jour de la position:', error);
    }
  }
}