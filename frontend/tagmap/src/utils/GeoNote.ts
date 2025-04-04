import * as L from 'leaflet';
import { NoteAccessLevel } from '../stores/notes';
import mapPinIcon from '../assets/map-pin.svg';

export interface GeoNoteOptions {
  name?: string;
  description?: string;
  columnId?: string;
  accessLevel?: NoteAccessLevel;
  radius?: number;
  color?: string;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
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

  constructor(latlng: L.LatLngExpression, options: GeoNoteOptions = {}) {
    // Créer une icône personnalisée pour le marqueur
    const color = options.color || '#3B82F6';
    const iconHtml = `<div class="geo-note-marker" style="color: ${color};"></div>`;

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
      description: options.description || 'Double-cliquez pour éditer',
      columnId: options.columnId || 'en-cours', // Colonne par défaut
      accessLevel: options.accessLevel || NoteAccessLevel.PRIVATE, // Niveau d'accès par défaut
      style: {
        color: defaultOptions.color,
        weight: defaultOptions.weight,
        fillColor: defaultOptions.fillColor,
        fillOpacity: defaultOptions.fillOpacity,
        radius: defaultOptions.radius
      }
    };

    // Ajouter un popup pour afficher la description
    this.bindPopup(this.createPopupContent());

    // Ajouter un gestionnaire d'événements pour le double-clic
    this.on('dblclick', this.onDoubleClick);
  }

  // Créer le contenu du popup
  createPopupContent(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'geo-note-popup';

    const title = document.createElement('div');
    title.className = 'geo-note-title';
    title.textContent = this.properties.name;
    container.appendChild(title);

    // Ajouter l'étiquette de colonne
    const columnBadge = document.createElement('div');
    columnBadge.className = 'geo-note-column-badge';
    columnBadge.textContent = this.properties.columnId;
    columnBadge.style.backgroundColor = this.getColumnColor(this.properties.columnId);
    container.appendChild(columnBadge);

    // Ajouter l'étiquette de niveau d'accès
    const accessBadge = document.createElement('div');
    accessBadge.className = 'geo-note-access-badge';
    accessBadge.textContent = this.getAccessLevelLabel(this.properties.accessLevel);
    accessBadge.style.backgroundColor = this.getAccessLevelColor(this.properties.accessLevel);
    container.appendChild(accessBadge);

    const description = document.createElement('div');
    description.className = 'geo-note-description';
    description.textContent = this.properties.description;
    container.appendChild(description);

    const editButton = document.createElement('button');
    editButton.className = 'geo-note-edit-button';
    editButton.textContent = 'Éditer';
    editButton.onclick = (e) => {
      e.stopPropagation();
      this.editNote();
    };
    container.appendChild(editButton);

    return container;
  }

  // Obtenir la couleur de la colonne (à remplacer par une intégration avec le store)
  getColumnColor(columnId: string): string {
    const colors: Record<string, string> = {
      'en-cours': '#3B82F6',
      'termine': '#10B981'
    };
    return colors[columnId] || '#6B7280';
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

    // Créer un objet note à partir des propriétés
    const note = {
      id: (this as any)._leaflet_id,
      title: this.properties.name,
      description: this.properties.description,
      location: [this.getLatLng().lat, this.getLatLng().lng] as [number, number],
      columnId: this.properties.columnId || 'en-cours', // Valeur par défaut
      accessLevel: this.properties.accessLevel || 'company', // Valeur par défaut
      style: this.properties.style || {
        color: '#3B82F6',
        weight: 2,
        opacity: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.6,
        radius: 8
      },
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      photos: []
    };

    // Émettre un événement pour ouvrir le modal d'édition
    console.log('[GeoNote] Émission de l\'\u00e9vénement note:edit avec', note);

    // Utiliser un événement personnalisé global pour éviter les problèmes avec Leaflet
    const event = new CustomEvent('geonote:edit', { detail: { note } });
    window.dispatchEvent(event);

    // Également émettre l'événement Leaflet standard (pour compatibilité)
    this.fire('note:edit', { note });
  }

  // Mettre à jour les propriétés
  updateProperties(): void {
    // Mettre à jour les propriétés de style
    // Pour un marqueur, nous stockons la couleur dans les propriétés
    const iconElement = this.getElement()?.querySelector('.geo-note-marker');
    const color = iconElement ?
      window.getComputedStyle(iconElement).color :
      '#3B82F6';

    this.properties.style = {
      color: color,
      fillColor: color,
      weight: 2,
      fillOpacity: 0.8,
      radius: 12
    };
  }

  // Méthode pour mettre à jour le style
  setNoteStyle(style: Partial<L.CircleMarkerOptions>): void {
    // Mettre à jour les propriétés de style
    if (style.color || style.fillColor) {
      const color = style.color || style.fillColor || '#3B82F6';
      const iconHtml = `<div class="geo-note-marker" style="color: ${color};"></div>`;

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36]
      });

      this.setIcon(icon);
    }

    // Mettre à jour les propriétés
    this.updateProperties();
  }
}
