import * as L from 'leaflet';
import { NoteAccessLevel } from '../stores/notes';

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

export class GeoNote extends L.CircleMarker {
  properties: {
    type: string;
    name: string;
    description: string;
    columnId: string;
    style: any;
    [key: string]: any;
  };

  constructor(latlng: L.LatLngExpression, options: GeoNoteOptions = {}) {
    // Options par défaut pour un point GPS
    const defaultOptions: L.CircleMarkerOptions = {
      radius: options.radius || 8,
      color: options.color || '#3B82F6',
      weight: options.weight || 2,
      fillColor: options.fillColor || '#3B82F6',
      fillOpacity: options.fillOpacity || 0.6
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
    // Créer un formulaire d'édition
    const form = document.createElement('form');
    form.className = 'geo-note-edit-form';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Titre:';
    form.appendChild(titleLabel);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = this.properties.name;
    form.appendChild(titleInput);

    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description:';
    form.appendChild(descriptionLabel);

    const descriptionInput = document.createElement('textarea');
    descriptionInput.value = this.properties.description;
    form.appendChild(descriptionInput);

    // Ajouter un sélecteur de colonne
    const columnLabel = document.createElement('label');
    columnLabel.textContent = 'État:';
    form.appendChild(columnLabel);

    const columnSelect = document.createElement('select');
    // Ajouter les options de colonne (à remplacer par une intégration avec le store)
    const columns = [
      { id: 'en-cours', title: 'En cours' },
      { id: 'termine', title: 'Terminé' }
    ];
    columns.forEach(column => {
      const option = document.createElement('option');
      option.value = column.id;
      option.textContent = column.title;
      option.selected = column.id === this.properties.columnId;
      columnSelect.appendChild(option);
    });
    form.appendChild(columnSelect);

    // Ajouter un sélecteur de niveau d'accès
    const accessLabel = document.createElement('label');
    accessLabel.textContent = 'Niveau d\'accès:';
    form.appendChild(accessLabel);

    const accessSelect = document.createElement('select');
    // Ajouter les options de niveau d'accès
    const accessLevels = [
      { id: NoteAccessLevel.PRIVATE, title: 'Privé' },
      { id: NoteAccessLevel.COMPANY, title: 'Entreprise' },
      { id: NoteAccessLevel.EMPLOYEE, title: 'Salariés' },
      { id: NoteAccessLevel.VISITOR, title: 'Visiteurs' }
    ];
    accessLevels.forEach(level => {
      const option = document.createElement('option');
      option.value = level.id;
      option.textContent = level.title;
      option.selected = level.id === this.properties.accessLevel;
      accessSelect.appendChild(option);
    });
    form.appendChild(accessSelect);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Enregistrer';
    saveButton.onclick = () => {
      this.properties.name = titleInput.value;
      this.properties.description = descriptionInput.value;
      this.properties.columnId = columnSelect.value;
      this.properties.accessLevel = accessSelect.value as NoteAccessLevel;
      this.updateProperties();
      this.closePopup();
      this.bindPopup(this.createPopupContent());
      this.openPopup();

      // Émettre un événement pour informer de la mise à jour
      this.fire('note:updated', {
        id: (this as any)._leaflet_id,
        properties: this.properties
      });
    };
    form.appendChild(saveButton);

    // Remplacer le contenu du popup
    this.unbindPopup();
    this.bindPopup(form);
    this.openPopup();
  }

  // Mettre à jour les propriétés
  updateProperties(): void {
    // Mettre à jour les propriétés de style
    this.properties.style = {
      color: this.options.color,
      weight: this.options.weight,
      fillColor: this.options.fillColor,
      fillOpacity: this.options.fillOpacity,
      radius: this.options.radius
    };
  }

  // Méthode pour mettre à jour le style
  setNoteStyle(style: Partial<L.CircleMarkerOptions>): void {
    // Mettre à jour les options
    if (style.color) this.options.color = style.color;
    if (style.weight) this.options.weight = style.weight;
    if (style.fillColor) this.options.fillColor = style.fillColor;
    if (style.fillOpacity !== undefined) this.options.fillOpacity = style.fillOpacity;
    if (style.radius) this.options.radius = style.radius;

    // Appliquer les changements
    this.setStyle(this.options);
    this.updateProperties();
  }
}
