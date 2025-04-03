import * as L from 'leaflet';

export interface GeoNoteOptions extends L.CircleMarkerOptions {
  name?: string;
  description?: string;
  columnId?: string;
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
      radius: 8,
      color: '#3B82F6',
      weight: 2,
      fillColor: '#3B82F6',
      fillOpacity: 0.6,
      ...options
    };

    super(latlng, defaultOptions);

    // Initialiser les propriétés
    this.properties = {
      type: 'Note',
      name: options.name || 'Note géolocalisée',
      description: options.description || 'Double-cliquez pour éditer',
      columnId: options.columnId || 'en-cours', // Colonne par défaut
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

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Enregistrer';
    saveButton.onclick = () => {
      this.properties.name = titleInput.value;
      this.properties.description = descriptionInput.value;
      this.properties.columnId = columnSelect.value;
      this.updateProperties();
      this.closePopup();
      this.bindPopup(this.createPopupContent());
      this.openPopup();

      // Émettre un événement pour informer de la mise à jour
      this.fire('note:updated', {
        id: this._leaflet_id,
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
