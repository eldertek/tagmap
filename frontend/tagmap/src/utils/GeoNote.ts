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

  // Déclaration de la méthode _onZoomStart avec initialisation
  private _onZoomStart: () => void = () => {};

  // Propriété pour suivre si la protection contre les erreurs d'animation de zoom est active
  private _zoomProtectionActive: boolean = false;

  constructor(latlng: L.LatLngExpression, options: GeoNoteOptions = {}) {
    // Options par défaut pour un marqueur - utiliser l'icône standard de Leaflet
    const defaultOptions: L.MarkerOptions = {
      draggable: false,
      autoPan: true,
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

    // Ajouter un popup pour afficher la description
    this.bindPopup(this.createPopupContent());

    // Ajouter un gestionnaire d'événements pour le double-clic
    this.on('dblclick', this.onDoubleClick);

    // Activer la protection contre les erreurs d'animation de zoom
    this._protectFromZoomAnimationErrors();

    // Ajouter des écouteurs pour les événements de carte
    this.on('add', (e: any) => {
      if (e.target && e.target._map) {
        // Quand la note est ajoutée à la carte, ajouter des écouteurs pour les événements de zoom et de déplacement
        const map = e.target._map;

        // D'abord, supprimer les écouteurs existants pour éviter les doublons
        map.off('zoomend', this.refreshIconStyle, this);
        map.off('moveend', this.refreshIconStyle, this);
        map.off('zoomstart', this._onZoomStart, this);
        map.off('zoomanim', this.updatePositionDuringZoom, this);

        // Ajouter des écouteurs pour rafraîchir l'icône après les événements de carte
        map.on('zoomend', () => this.refreshIconStyle());
        map.on('moveend', () => this.refreshIconStyle());

        // Ajouter un écouteur pour l'événement zoomstart pour éviter le mouvement pendant le zoom
        map.on('zoomstart', this._onZoomStart = () => {
          // Forcer une mise à jour de la position au début du zoom
          setTimeout(() => {
            this.updatePosition();
          }, 0);
        });

        // Ajouter un écouteur pendant l'animation de zoom
        // Utiliser la méthode updatePositionDuringZoom directement pour éviter les problèmes de contexte
        map.on('zoomanim', (e: any) => this.updatePositionDuringZoom(e));
      }
    });

    // Nettoyer les écouteurs lorsque la note est retirée de la carte
    this.on('remove', () => {
      if (this._map) {
        this._map.off('zoomend', this.refreshIconStyle, this);
        this._map.off('moveend', this.refreshIconStyle, this);
        this._map.off('zoomstart', this._onZoomStart, this);
        this._map.off('zoomanim', this._animateZoom, this);
        this._map.off('zoomanim', this.updatePositionDuringZoom, this);
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
        this.bindPopup(this.createPopupContent());
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
        this.bindPopup(this.createPopupContent());

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

  // Créer le contenu du popup
  createPopupContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'geo-note-popup';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Créer l'en-tête
    const header = document.createElement('div');
    header.className = 'geo-note-header';
    container.appendChild(header);

    // Ajouter le titre
    const title = document.createElement('div');
    title.className = 'geo-note-title';
    title.textContent = this.properties.name;
    header.appendChild(title);

    // Conteneur pour les badges
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'geo-note-badges';
    header.appendChild(badgesContainer);

    // Ajouter l'étiquette de colonne
    const columnBadge = document.createElement('div');
    columnBadge.className = 'geo-note-badge';
    columnBadge.style.backgroundColor = this.getColumnColor(this.properties.columnId);

    // Ajouter une icône pour la colonne
    columnBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
        <path d="M11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
      ${this.getColumnLabel(this.properties.columnId)}
    `;
    badgesContainer.appendChild(columnBadge);

    // Ajouter l'étiquette de niveau d'accès
    const accessBadge = document.createElement('div');
    accessBadge.className = 'geo-note-badge';
    accessBadge.style.backgroundColor = this.getAccessLevelColor(this.properties.accessLevel);

    // Ajouter une icône pour le niveau d'accès
    accessBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
      </svg>
      ${this.getAccessLevelLabel(this.properties.accessLevel)}
    `;
    badgesContainer.appendChild(accessBadge);

    // Créer le contenu seulement si une description existe
    if (this.properties.description && this.properties.description.trim() !== '') {
      const content = document.createElement('div');
      content.className = 'geo-note-content';
      container.appendChild(content);

      const description = document.createElement('div');
      description.className = 'geo-note-description';
      description.textContent = this.properties.description;
      content.appendChild(description);
    }

    // Créer le pied de page avec les boutons directement intégrés
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'geo-note-buttons';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.width = '100%';
    buttonsContainer.style.marginTop = 'auto';
    buttonsContainer.style.borderTop = '1px solid #E5E7EB';
    container.appendChild(buttonsContainer);

    // Ajouter le bouton d'édition
    const editButton = document.createElement('button');
    editButton.className = 'geo-note-edit-button';
    editButton.style.flex = '1';
    editButton.style.height = '36px';
    editButton.style.border = 'none';
    editButton.style.borderRight = '1px solid #E5E7EB';
    editButton.style.background = 'transparent';
    editButton.style.color = '#4B5563';
    editButton.style.fontSize = '11px';
    editButton.style.fontWeight = '500';
    editButton.style.display = 'flex';
    editButton.style.alignItems = 'center';
    editButton.style.justifyContent = 'center';
    editButton.style.cursor = 'pointer';
    editButton.style.padding = '0';
    editButton.style.margin = '0';
    editButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 mr-1 inline-block align-text-bottom">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
      Éditer
    `;
    editButton.onclick = (e) => {
      e.stopPropagation();
      this.editNote();
    };
    buttonsContainer.appendChild(editButton);

    // Ajouter le bouton pour ouvrir dans Google Maps
    const openButton = document.createElement('button');
    openButton.className = 'geo-note-open-button';
    openButton.style.flex = '1';
    openButton.style.height = '36px';
    openButton.style.border = 'none';
    openButton.style.background = 'transparent';
    openButton.style.color = '#3B82F6';
    openButton.style.fontSize = '11px';
    openButton.style.fontWeight = '500';
    openButton.style.display = 'flex';
    openButton.style.alignItems = 'center';
    openButton.style.justifyContent = 'center';
    openButton.style.cursor = 'pointer';
    openButton.style.padding = '0';
    openButton.style.margin = '0';
    openButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 mr-1 inline-block align-text-bottom">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
      </svg>
      Itinéraire
    `;
    openButton.onclick = (e) => {
      e.stopPropagation();
      this.openInGoogleMaps();
    };
    buttonsContainer.appendChild(openButton);

    return container;
  }

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
    // Fermer le popup
    this.closePopup();

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
    const event = new CustomEvent('geonote:edit', { detail: { note, source: this } });
    window.dispatchEvent(event);

    // Également émettre l'événement Leaflet standard (pour compatibilité)
    this.fire('note:edit', { note, source: this });
  }

  // Méthode pour ouvrir Google Maps avec itinéraire
  openInGoogleMaps(): void {
    // Fermer le popup
    this.closePopup();

    // Récupérer les coordonnées de la note
    const lat = this.getLatLng().lat;
    const lng = this.getLatLng().lng;

    // Construire l'URL Google Maps pour l'itinéraire
    // L'origine sera la position actuelle de l'utilisateur (laissée vide pour que Google l'utilise automatiquement)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Ouvrir l'URL dans un nouvel onglet
    window.open(url, '_blank');
  }

  // Mets à jour les propriétés du style de la note basées sur le contenu du DOM
  updateProperties(): void {
    // Récupérer la couleur actuelle
    let color = this.properties.style?.color || '#2b6451';

    // Si la couleur est au format rgb, essayer de la convertir
    if (color.startsWith('rgb')) {
      const element = this.getElement();
      if (element) {
        const svg = element.querySelector('.geo-note-marker svg path');
        if (svg) {
          const fill = svg.getAttribute('fill');
          if (fill) {
            color = fill;
            console.log('[GeoNote][updateProperties] Couleur identifiée à partir du SVG:', color);
          }
        }
      }
    }

    // Si aucune couleur valide n'a été trouvée, utiliser la couleur par défaut
    if (!color || color.startsWith('rgb')) {
      color = '#2b6451';
      console.log('[GeoNote][updateProperties] Utilisation de la couleur par défaut:', color);
    }

    console.log('[GeoNote][updateProperties] Couleur finale utilisée:', color);

    // Récupérer d'autres propriétés de style
    const radius = this.properties.style?.radius || 12;

    // Mettre à jour le style
    this.properties.style = {
      ...this.properties.style,
      color: color,
      weight: this.properties.style?.weight || 2,
      fillColor: color,
      fillOpacity: this.properties.style?.fillOpacity || 0.8,
      radius: radius,
      _accessLevel: this.properties.accessLevel,
      accessLevel: this.properties.accessLevel,
      category: this.properties.category
    };

    console.log('[GeoNote][updateProperties] Style mis à jour:', this.properties.style);

    // Mettre à jour le popup pour refléter les changements
    this.bindPopup(this.createPopupContent());
  }

  // Méthode pour mettre à jour le style de la note
  setNoteStyle(style: any): void {
    console.log('[GeoNote][setNoteStyle] Mise à jour du style:', style);

    // Récupérer la couleur depuis le style
    const strokeColor = style.color || style.fillColor || '#2b6451';
    const fillColor = style.fillColor || style.color || '#2b6451';

    console.log('[GeoNote][setNoteStyle] Nouvelles couleurs - stroke:', strokeColor, 'fill:', fillColor);

    // Utiliser la nouvelle approche avec des icônes précolorées
    this.updateIconForColor(fillColor);

    // Récupérer le niveau d'accès et la catégorie
    const accessLevel = style._accessLevel || style.accessLevel || this.properties.accessLevel;
    const category = style.category || this.properties.category;

    // Mettre à jour le style stocké dans les propriétés
    if (this.properties && this.properties.style) {
      this.properties.style = {
        ...this.properties.style,
        ...style,
        color: strokeColor,
        fillColor: fillColor
      };
    }

    // Mettre à jour le niveau d'accès si nécessaire
    if (accessLevel && this.properties.accessLevel !== accessLevel) {
      this.properties.accessLevel = accessLevel;
      console.log('[GeoNote][setNoteStyle] Niveau d\'accès mis à jour:', accessLevel);
    }

    // Mettre à jour la catégorie si nécessaire
    if (category && this.properties.category !== category) {
      this.properties.category = category;
      console.log('[GeoNote][setNoteStyle] Catégorie mise à jour:', category);
    }

    // Rafraîchir le style de l'icône
    this.refreshIconStyle();

    console.log('[GeoNote][setNoteStyle] Mise à jour du popup');

    // Mettre à jour le popup pour refléter les changements
    this.bindPopup(this.createPopupContent());
  }

  // Méthode pour rafraîchir le style de l'icône
  private refreshIconStyle(): void {
    // Uniquement mettre à jour la position si nécessaire
    this.updatePosition();
  }

  // Méthode pour mettre à jour l'icône
  private updateIconForColor(fillColor: string): void {
    // Ne rien faire, on garde l'icône par défaut de Leaflet
    console.log('[GeoNote][updateIconForColor] Conservation de l\'icône par défaut, aucune action nécessaire');
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
    this.bindPopup(this.createPopupContent());

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
    note.bindPopup(note.createPopupContent());

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
        styleFillColor: this.properties.style?.fillColor
      });

      // S'assurer que le style contient le niveau d'accès, la catégorie et la couleur correcte
      // Vérifier si la couleur est au format rgb et la convertir en hex si nécessaire
      let color = this.properties.style?.color || '#2b6451';

      // Si la couleur est au format rgb, essayer de la convertir
      if (color.startsWith('rgb')) {
        const element = this.getElement();
        if (element) {
          const svg = element.querySelector('.geo-note-marker svg path');
          if (svg) {
            const fill = svg.getAttribute('fill');
            if (fill) {
              color = fill;
              console.log('[GeoNote][saveNote] Couleur identifiée à partir du SVG:', color);
            }
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
        this.bindPopup(this.createPopupContent());
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
        this.bindPopup(this.createPopupContent());

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

    // Mettre à jour le popup pour refléter la nouvelle position
    this.bindPopup(this.createPopupContent());

    // Forcer une mise à jour du rendu de la couche
    if (this._map) {
      // Forcer un rafraîchissement de la couche pour éviter les artefacts visuels
      this._map.invalidateSize();
    }

    // Déclencher la sauvegarde du plan
    this.triggerPlanSave();
  }

  // Méthode pour commencer le déplacement
  startMoving(): void {
    this._isMoving = true;
    // Fermer le popup pendant le déplacement
    this.closePopup();
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

  // Méthode pour mettre à jour la position pendant l'animation de zoom
  private updatePositionDuringZoom(e: any): void {
    try {
      const element = this.getElement();
      if (!element || !this._map) return;

      // Vérifier que l'événement contient les données nécessaires
      if (!e || !e.center || e.zoom === undefined) {
        console.warn('[GeoNote][updatePositionDuringZoom] Événement de zoom incomplet');
        return;
      }

      // Récupérer les données de zoom
      const scale = this._map.getZoomScale(e.zoom, this._map.getZoom());
      const position = this._map.latLngToLayerPoint(this.getLatLng());

      // Utilisons une approche simplifiée qui fonctionne mieux avec notre marqueur
      if (scale !== 1) {
        // Pendant un changement d'échelle, utilisons une transformation simple
        L.DomUtil.setTransform(element, position, 1);
        // Masquer temporairement l'élément pendant le zoom pour éviter les artefacts
        element.style.opacity = '0.6';
        
        // Rétablir l'opacité après la fin du zoom
        setTimeout(() => {
          element.style.opacity = '1';
          this.updatePosition();
        }, 300);
      } else {
        // Si pas de changement d'échelle, mettre à jour normalement
        L.DomUtil.setPosition(element, position);
      }
    } catch (error) {
      console.warn('[GeoNote][updatePositionDuringZoom] Erreur:', error);
      // En cas d'erreur, essayer de mettre à jour la position après un délai
      setTimeout(() => this.updatePosition(), 100);
    }
  }

  // Méthode pour mettre à jour la position de l'icône
  private updatePosition(): void {
    try {
      const element = this.getElement();
      if (element && this._map) {
        const pos = this._map.latLngToLayerPoint(this.getLatLng());
        L.DomUtil.setPosition(element, pos);
      }
    } catch (e) {
      console.warn('[GeoNote][updatePosition] Erreur lors de la mise à jour de la position:', e);
    }
  }

  // Méthode pour protéger contre les erreurs d'animation de zoom
  _protectFromZoomAnimationErrors(): void {
    if (this._zoomProtectionActive) return;

    console.log('[GeoNote][_protectFromZoomAnimationErrors] Protection contre les erreurs d\'animation de zoom activée');

    // Remplacer la méthode _animateZoom de cette instance par une version sécurisée
    this._animateZoom = (e: any) => {
      try {
        // Vérifier que la carte est disponible
        if (!this._map) return;

        // Récupérer les données de zoom
        const scale = this._map.getZoomScale(e.zoom, this._map.getZoom());
        const position = this._map.latLngToLayerPoint(this.getLatLng());
        const element = this.getElement();

        if (!element) return;

        // Utiliser la même approche simplifiée que dans updatePositionDuringZoom
        if (scale !== 1) {
          // Pendant un changement d'échelle, utiliser une transformation simple
          L.DomUtil.setTransform(element, position, 1);
          // Masquer temporairement l'élément pendant le zoom pour éviter les artefacts
          element.style.opacity = '0.6';
          
          // Rétablir l'opacité après la fin du zoom
          setTimeout(() => {
            element.style.opacity = '1';
            this.updatePosition();
          }, 300);
        } else {
          // Si pas de changement d'échelle, mettre à jour normalement
          L.DomUtil.setPosition(element, position);
        }
      } catch (error) {
        console.warn('[GeoNote][_animateZoom] Erreur d\'animation capturée:', error);
        // En cas d'erreur, essayer de mettre à jour la position après un délai
        setTimeout(() => this.updatePosition(), 100);
      }
    };

    // Ajouter un écouteur pour l'événement zoomanim de la carte
    this.on('add', () => {
      if (this._map) {
        this._map.on('zoomanim', this._animateZoom);
      }
    });

    // Marquer la protection comme active
    this._zoomProtectionActive = true;
  }
}
