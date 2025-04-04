import * as L from 'leaflet';
import { NoteAccessLevel } from '../stores/notes';
import type { DrawingElementType, NoteData } from '../types/drawing';

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

  constructor(latlng: L.LatLngExpression, options: GeoNoteOptions = {}) {
    // Créer une icône personnalisée pour le marqueur
    const color = options.color || '#2b6451';
    const iconHtml = `
      <div class="geo-note-marker">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });

    // Options par défaut pour un marqueur
    const defaultOptions: L.MarkerOptions = {
      icon: icon,
      draggable: false,
      autoPan: true
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

    // Ajouter un écouteur pour la mise à jour du style
    window.addEventListener('geonote:updateStyle', ((e: CustomEvent) => {
      const leafletId = (this as any)._leaflet_id;
      const backendId = this.properties.id;
      const eventNoteId = e.detail.noteId;
      
      console.log('[GeoNote][updateStyle] Événement reçu pour noteId:', eventNoteId, 
                  'Comparaison avec - ID Leaflet:', leafletId, 'ID backend:', backendId);
      
      // Vérifier si l'ID dans l'événement correspond soit à l'ID Leaflet, soit à l'ID backend
      if (eventNoteId === leafletId || (backendId && eventNoteId === backendId)) {
        console.log('[GeoNote][updateStyle] Correspondance trouvée, mise à jour du style:', e.detail.style);
        this.setNoteStyle(e.detail.style);
        // Mettre à jour le popup pour refléter les changements
        this.bindPopup(this.createPopupContent());
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
    const noteId = this.properties.id || (this as any)._leaflet_id;

    console.log(`[GeoNote][editNote] Édition de note - ID backend: ${this.properties.id}, ID Leaflet: ${(this as any)._leaflet_id}, ID utilisé: ${noteId}`);

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
    const event = new CustomEvent('geonote:edit', { detail: { note } });
    window.dispatchEvent(event);

    // Également émettre l'événement Leaflet standard (pour compatibilité)
    this.fire('note:edit', { note });
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

    // Mettre à jour les propriétés de style
    // Pour un marqueur, nous stockons la couleur dans les propriétés
    const iconElement = this.getElement()?.querySelector('.geo-note-marker');
    const color = iconElement ?
      window.getComputedStyle(iconElement).color :
      '#2b6451';

    // Conserver le radius existant s'il existe
    const existingRadius = (this.properties.style as any)?.radius || 12;

    this.properties.style = {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.8,
      radius: existingRadius
    };
  }

  // Méthode pour mettre à jour le style
  setNoteStyle(style: any): void {
    console.log('[GeoNote][setNoteStyle] Mise à jour du style:', style);
    
    // S'assurer que nous avons des valeurs pour color et fillColor
    const color = style.color || style.fillColor || '#2b6451';
    const fillColor = style.fillColor || style.color || '#2b6451';
    
    console.log('[GeoNote][setNoteStyle] Nouvelles couleurs - stroke:', color, 'fill:', fillColor);
      
    // Créer une nouvelle icône avec le SVG coloré
    const iconHtml = `
      <div class="geo-note-marker">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fillColor}" width="24" height="24">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    `;
    console.log('[GeoNote][setNoteStyle] Nouvel HTML d\'icône:', iconHtml);

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });

    this.setIcon(icon);
    console.log('[GeoNote][setNoteStyle] Nouvelle icône appliquée');

    // S'assurer que le style dans les propriétés est à jour
    if (this.properties && this.properties.style) {
      this.properties.style = {
        ...this.properties.style,
        color: color,
        weight: style.weight || this.properties.style.weight || 2,
        fillColor: fillColor,
        fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : this.properties.style.fillOpacity || 0.8,
        radius: style.radius || (this.properties.style as any)?.radius || 12
      };
      console.log('[GeoNote][setNoteStyle] Style mis à jour dans les propriétés:', this.properties.style);
    }

    // Mettre à jour le popup pour refléter les changements
    this.bindPopup(this.createPopupContent());
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
    // S'assurer que le type est correctement défini
    this.properties.type = 'Note';

    // S'assurer que le style contient le radius
    const style = data.style ? {
      ...data.style,
      radius: (data.style as any).radius || 12
    } : this.properties.style;

    // S'assurer que columnId est défini et vaut '1' (Idées) par défaut
    const columnId = data.columnId || this.properties.columnId || '1';
    console.log('[GeoNote][updateFromBackendData] Mise à jour de note avec columnId:', columnId);

    // Mettre à jour les propriétés
    this.properties = {
      ...this.properties,
      name: data.name || this.properties.name,
      description: data.description || this.properties.description,
      columnId: columnId, // Utiliser la colonne 'Idées' par défaut si non spécifié
      accessLevel: data.accessLevel || this.properties.accessLevel,
      category: data.category || this.properties.category || 'forages',
      style: style,
      comments: data.comments || this.properties.comments || [],
      photos: data.photos || this.properties.photos || [],
      order: data.order || this.properties.order || 0,
      createdAt: data.createdAt || this.properties.createdAt,
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Mettre à jour le style visuel
    this.setNoteStyle(style);

    // Mettre à jour le popup
    this.bindPopup(this.createPopupContent());

    console.log('[GeoNote][updateFromBackendData] Note mise à jour:', {
      name: this.properties.name,
      type: this.properties.type,
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

    // Forcer la mise à jour du niveau d'accès dans les données
    data.accessLevel = accessLevel;

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
      style: note.properties.style
    });

    // Retourner la note créée
    return note;
  }

  // Méthode pour déclencher la sauvegarde du plan
  triggerPlanSave(): void {
    // Éviter les sauvegardes multiples
    if (this._planSaved) return;

    console.log('[GeoNote][triggerPlanSave] Déclenchement de la sauvegarde automatique du plan');

    // Émettre un événement pour déclencher la sauvegarde du plan
    const event = new CustomEvent('geonote:savePlan');
    window.dispatchEvent(event);

    // Marquer la note comme sauvegardée avec le plan
    this._planSaved = true;
  }

  // Méthode pour réinitialiser l'état de sauvegarde du plan
  resetPlanSaveState(): void {
    this._planSaved = false;
  }
}
