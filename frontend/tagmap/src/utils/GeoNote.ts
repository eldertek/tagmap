import * as L from 'leaflet';
import { NoteAccessLevel } from '../stores/notes';
import type { DrawingElementType } from '../types/drawing';

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
    const color = options.color || '#2b6451';
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
      description: options.description || '',
      columnId: options.columnId || 'en-cours', // Colonne par défaut
      accessLevel: options.accessLevel || NoteAccessLevel.PRIVATE, // Niveau d'accès par défaut
      style: {
        color: options.color || '#2b6451',
        weight: options.weight || 2,
        fillColor: options.fillColor || '#2b6451',
        fillOpacity: options.fillOpacity !== undefined ? options.fillOpacity : 0.8,
        radius: options.radius || 12
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
      Ouvrir
    `;
    openButton.onclick = (e) => {
      e.stopPropagation();
      this.openInGoogleMaps();
    };
    buttonsContainer.appendChild(openButton);

    return container;
  }

  // Obtenir la couleur et le nom de la colonne (à remplacer par une intégration avec le store)
  getColumnColor(columnId: string): string {
    const colors: Record<string, string> = {
      'en-cours': '#2b6451',
      'termine': '#10B981'
    };
    return colors[columnId] || '#6B7280';
  }

  // Obtenir le nom de la colonne
  getColumnLabel(columnId: string): string {
    const labels: Record<string, string> = {
      'en-cours': 'En cours',
      'termine': 'Terminé'
    };
    return labels[columnId] || columnId;
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
    // Mettre à jour les propriétés de style
    // Pour un marqueur, nous stockons la couleur dans les propriétés
    const iconElement = this.getElement()?.querySelector('.geo-note-marker');
    const color = iconElement ?
      window.getComputedStyle(iconElement).color :
      '#2b6451';

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
      const color = style.color || style.fillColor || '#2b6451';
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
