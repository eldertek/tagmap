import L from 'leaflet';
import { Circle } from './Circle';
import { performanceMonitor } from './usePerformanceMonitor';

// Interface pour définir une section du cercle
export interface CircleSection {
  id: string;
  startAngle: number;
  endAngle: number;
  radius: number;
  color: string;
  name?: string;
  surface?: number; // Surface de la section en m²
}

// Interface étendue pour les options du cercle avec sections
interface CircleWithSectionsOptions extends L.CircleOptions {
  name?: string;
  sections?: CircleSection[];
}

/**
 * Classe CircleWithSections qui étend Circle pour ajouter
 * la gestion de sections d'irrigation
 */
export class CircleWithSections extends Circle {
  protected _sections: CircleSection[] = [];
  protected _sectionLayers: L.Polygon[] = [];
  protected _isDragging: boolean = false;
  protected _dragTimeout: number | null = null;

  constructor(
    center: L.LatLngExpression,
    options: CircleWithSectionsOptions
  ) {
    super(center, options);
    
    performanceMonitor.measure('CircleWithSections.constructor', () => {
      // Initialiser les sections depuis les options
      this._sections = options.sections || [];

      // Mettre à jour le type dans les propriétés
      this.properties.type = 'CircleWithSections';

      // Ajouter les sections aux propriétés
      this.properties.sections = this._sections;
      
      // Écouter les changements
      this.on('add', () => {
        // Attendre que la carte soit prête
        setTimeout(() => this._initSections(), 100);
      });
      this.on('remove', () => this._clearSections());

      // Écouter les événements de déplacement
      this.on('dragstart', () => {
        this._isDragging = true;
        this._clearSections(); // Cacher les sections pendant le déplacement
      });

      this.on('drag', () => {
        if (this._dragTimeout) {
          clearTimeout(this._dragTimeout);
        }
        this._dragTimeout = window.setTimeout(() => {
          if (this._isDragging && this._map) {
            this._renderSectionsPreview();
          }
        }, 50);
      });

      this.on('dragend', () => {
        this._isDragging = false;
        if (this._dragTimeout) {
          clearTimeout(this._dragTimeout);
          this._dragTimeout = null;
        }
        // Attendre que la carte soit stable
        setTimeout(() => {
          if (this._map) {
            this._initSections();
            this.updateProperties();
          }
        }, 100);
      });

      // Ajouter les écouteurs pour les événements de zoom
      this.on('zoomanim', () => {
        if (!this._map) return;
        this._clearSections();
      });

      this.on('zoomend', () => {
        if (!this._map) return;
        // Attendre que la carte soit stable
        setTimeout(() => {
          if (this._map) {
            this._clearSections();
            this._initSections();
          }
        }, 100);
      });

      // Mettre à jour les propriétés après l'initialisation complète
      this.updateProperties();

      return this;
    });
  }

  /**
   * Initialise les sections visuellement sur la carte
   */
  protected _initSections(): void {
    performanceMonitor.measure('CircleWithSections._initSections', () => {
      const map = this.getMap();
      if (!map) return;
      
      // S'assurer que toutes les anciennes sections sont nettoyées
      this._clearSections();
      
      // Attendre le prochain cycle pour s'assurer que la carte est prête
      setTimeout(() => {
        // Vérifier à nouveau que la carte est toujours disponible
        if (!this.getMap()) return;
        
        // Créer les visualisations des sections
        this._sections.forEach(section => {
          this._renderSection(section);
        });
      }, 0);
    });
  }
  
  /**
   * Nettoie les sections visuelles de la carte
   */
  protected _clearSections(): void {
    performanceMonitor.measure('CircleWithSections._clearSections', () => {
      this._sectionLayers.forEach(layer => {
        try {
          if (layer && layer.remove && this._map && this._map.hasLayer(layer)) {
            layer.remove();
          }
        } catch (error) {
          console.warn('Erreur lors de la suppression d\'une section:', error);
        }
      });
      this._sectionLayers = [];
    });
  }
  
  /**
   * Vérifie si une section forme un cercle complet
   */
  protected _isFullCircle(section: CircleSection): boolean {
    return performanceMonitor.measure('CircleWithSections._isFullCircle', () => {
      return section.startAngle === 0 && section.endAngle === 360;
    });
  }
  
  /**
   * Rend une section individuelle sur la carte
   */
  protected _renderSection(section: CircleSection): void {
    performanceMonitor.measure('CircleWithSections._renderSection', () => {
      const map = this.getMap();
      if (!map) return;
      
      const center = this.getLatLng();
      const points: L.LatLng[] = [];
      
      const isFullCircle = this._isFullCircle(section);
      
      if (isFullCircle) {
        console.log('[CircleWithSections] Rendu d\'une section circulaire complète', {
          sectionId: section.id,
          name: section.name,
          radius: section.radius
        });

        // Pour un cercle complet, créer un cercle régulier
        const circle = new L.Circle(center, {
          radius: section.radius,
          color: section.color,
          fillColor: section.color,
          fillOpacity: 0.4,
          weight: 2,
          interactive: true
        });
        
        // Ajouter le cercle à la carte
        circle.addTo(map);
        this._sectionLayers.push(circle as unknown as L.Polygon);
        
        // Ajouter l'événement de clic pour sélectionner le cercle parent
        circle.on('click', (e: L.LeafletEvent) => {
          console.log('[CircleWithSections] Clic sur une section circulaire complète', {
            sectionId: section.id,
            name: section.name,
            event: e,
            parentCircle: this
          });

          // Émettre un événement personnalisé avant le clic
          this._emitCustomEvent('section:clicked', {
            section,
            parentCircle: this
          });

          // Trouver le featureGroup parent
          const featureGroup = this._findFeatureGroup();
          if (featureGroup) {
            // Forcer la sélection du cercle parent
            featureGroup.fire('click', {
              ...e,
              layer: this,
              target: this,
              type: 'click'
            });
          }
        });
        
        return;
      }

      console.log('[CircleWithSections] Rendu d\'une section partielle', {
        sectionId: section.id,
        name: section.name,
        startAngle: section.startAngle,
        endAngle: section.endAngle,
        radius: section.radius
      });

      // Pour une section partielle, créer un polygone
      points.push(center);
      
      const numPoints = 32;
      const angleRange = section.endAngle - section.startAngle;
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = section.startAngle + (angleRange * i) / numPoints;
        const point = this._calculatePointOnCircle(angle, section.radius);
        points.push(point);
      }
      
      points.push(center);
      
      const sectionLayer = new L.Polygon(points, {
        color: section.color,
        fillColor: section.color,
        fillOpacity: 0.4,
        weight: 2,
        interactive: true
      });
      
      sectionLayer.addTo(map);
      this._sectionLayers.push(sectionLayer);
      
      // Ajouter l'événement de clic pour sélectionner le cercle parent
      sectionLayer.on('click', (e: L.LeafletEvent) => {
        console.log('[CircleWithSections] Clic sur une section partielle', {
          sectionId: section.id,
          name: section.name,
          event: e,
          parentCircle: this
        });

        // Émettre un événement personnalisé avant le clic
        this._emitCustomEvent('section:clicked', {
          section,
          parentCircle: this
        });

        // Trouver le featureGroup parent
        const featureGroup = this._findFeatureGroup();
        if (featureGroup) {
          // Forcer la sélection du cercle parent
          featureGroup.fire('click', {
            ...e,
            layer: this,
            target: this,
            type: 'click'
          });
        }
      });
    });
  }
  
  /**
   * Trouve le featureGroup parent qui contient ce cercle
   */
  private _findFeatureGroup(): L.FeatureGroup | null {
    return performanceMonitor.measure('CircleWithSections._findFeatureGroup', () => {
      if (!this._map) return null;

      // Parcourir toutes les couches de la carte
      let featureGroup: L.FeatureGroup | null = null;
      this._map.eachLayer((layer) => {
        if (layer instanceof L.FeatureGroup && layer.hasLayer(this)) {
          featureGroup = layer;
        }
      });

      return featureGroup;
    });
  }
  
  /**
   * Normalise un angle entre 0 et 360 degrés
   */
  protected _normalizeAngle(angle: number): number {
    return performanceMonitor.measure('CircleWithSections._normalizeAngle', () => {
      return ((angle % 360) + 360) % 360;
    });
  }

  /**
   * Met à jour les angles d'une section avec des limites et une animation fluide
   */
  protected _updateSectionAngles(section: CircleSection, startAngle: number | null, endAngle: number | null): void {
    performanceMonitor.measure('CircleWithSections._updateSectionAngles', () => {
      const currentStart = this._normalizeAngle(section.startAngle);
      const currentEnd = this._normalizeAngle(section.endAngle);
      
      const currentOpeningAngle = (currentEnd - currentStart + 360) % 360;
      
      let newStart = startAngle !== null ? this._normalizeAngle(startAngle) : currentStart;
      let newEnd = endAngle !== null ? this._normalizeAngle(endAngle) : currentEnd;
      
      let newOpeningAngle = (newEnd - newStart + 360) % 360;
      
      const maxAngleChange = 45;
      if (Math.abs(newOpeningAngle - currentOpeningAngle) > maxAngleChange) {
        if (newOpeningAngle > currentOpeningAngle) {
          newOpeningAngle = currentOpeningAngle + maxAngleChange;
        } else {
          newOpeningAngle = currentOpeningAngle - maxAngleChange;
        }
        
        if (startAngle !== null) {
          newEnd = (newStart + newOpeningAngle) % 360;
        } else {
          newStart = (newEnd - newOpeningAngle + 360) % 360;
        }
      }
      
      if (newOpeningAngle < 355) {
        newOpeningAngle = Math.max(5, newOpeningAngle);
        
        if (startAngle !== null) {
          newEnd = (newStart + newOpeningAngle) % 360;
        } else {
          newStart = (newEnd - newOpeningAngle + 360) % 360;
        }
      }
      
      section.startAngle = newStart;
      section.endAngle = newEnd;
    });
  }

  /**
   * Ajoute les événements aux marqueurs pour permettre le redimensionnement des sections
   */
  protected _addMarkerEvents(startMarker: L.CircleMarker, endMarker: L.CircleMarker, section: CircleSection): void {
    performanceMonitor.measure('CircleWithSections._addMarkerEvents', () => {
      let isDragging = false;
      const map = this.getMap();
      if (!map) return;

      // Fonction pour gérer le déplacement des marqueurs
      const handleMarkerDrag = (e: L.LeafletMouseEvent, isStartMarker: boolean) => {
        if (!isDragging) return;

        // Calculer le nouvel angle
        const angle = this._calculateAngleFromPoint(e.latlng);
        
        // Mettre à jour les angles de la section
        if (isStartMarker) {
          this._updateSectionAngles(section, angle, null);
        } else {
          this._updateSectionAngles(section, null, angle);
        }

        // Re-rendre les sections
        this._clearSections();
        this._renderSection(section);

        // Émettre un événement pour la mise à jour de l'interface
        this._emitCustomEvent('section:visual-update', {
          section,
          sections: this._sections
        });
      };

      // Fonction pour terminer le drag
      const handleMarkerDragEnd = () => {
        isDragging = false;
        map.dragging.enable();
        this.updateProperties();

        // Émettre un événement final
        this._emitCustomEvent('section:updated', {
          section,
          sections: this._sections
        });
      };

      // Événements pour le marqueur de début
      startMarker.on('mousedown', () => {
        isDragging = true;
        map.dragging.disable();
      });

      startMarker.on('mousemove', (e: L.LeafletMouseEvent) => {
        handleMarkerDrag(e, true);
      });

      startMarker.on('mouseup', handleMarkerDragEnd);
      startMarker.on('mouseout', () => {
        if (isDragging) {
          handleMarkerDragEnd();
        }
        startMarker.setStyle({
          radius: 5,
          fillOpacity: 1
        });
        map.getContainer().style.cursor = '';
      });

      // Événements pour le marqueur de fin
      endMarker.on('mousedown', () => {
        isDragging = true;
        map.dragging.disable();
      });

      endMarker.on('mousemove', (e: L.LeafletMouseEvent) => {
        handleMarkerDrag(e, false);
      });

      endMarker.on('mouseup', handleMarkerDragEnd);
      endMarker.on('mouseout', () => {
        if (isDragging) {
          handleMarkerDragEnd();
        }
        endMarker.setStyle({
          radius: 5,
          fillOpacity: 1
        });
        map.getContainer().style.cursor = '';
      });

      // Ajouter les événements de survol pour améliorer l'UX
      const handleMarkerHover = (marker: L.CircleMarker, isHovering: boolean) => {
        if (isHovering) {
          marker.setStyle({
            radius: 6,
            fillOpacity: 0.8
          });
          map.getContainer().style.cursor = 'pointer';
        } else if (!isDragging) {
          marker.setStyle({
            radius: 5,
            fillOpacity: 1
          });
          map.getContainer().style.cursor = '';
        }
      };

      startMarker.on('mouseover', () => handleMarkerHover(startMarker, true));
      startMarker.on('mouseout', () => handleMarkerHover(startMarker, false));
      endMarker.on('mouseover', () => handleMarkerHover(endMarker, true));
      endMarker.on('mouseout', () => handleMarkerHover(endMarker, false));

      // Ajouter les événements globaux pour gérer le drag en dehors des marqueurs
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        if (isDragging) {
          const target = e.originalEvent.target;
          if (target === startMarker.getElement()) {
            handleMarkerDrag(e, true);
          } else if (target === endMarker.getElement()) {
            handleMarkerDrag(e, false);
          }
        }
      });

      map.on('mouseup', () => {
        if (isDragging) {
          handleMarkerDragEnd();
        }
      });
    });
  }
  
  /**
   * Calcule la position d'un point sur le cercle à un angle donné et un rayon spécifique
   */
  protected _calculatePointOnCircle(angle: number, sectionRadius: number): L.LatLng {
    return performanceMonitor.measure('CircleWithSections._calculatePointOnCircle', () => {
      const center = this.getLatLng();
      const rad = (angle * Math.PI) / 180;
      
      // Ne plus limiter le rayon de la section
      const radius = sectionRadius;
      
      return L.latLng(
        center.lat + (radius / 111319.9) * Math.sin(rad),
        center.lng + (radius / (111319.9 * Math.cos(center.lat * Math.PI / 180))) * Math.cos(rad)
      );
    });
  }
  
  /**
   * Calcule l'angle entre un point et le centre du cercle
   */
  protected _calculateAngleFromPoint(point: L.LatLng): number {
    return performanceMonitor.measure('CircleWithSections._calculateAngleFromPoint', () => {
      const center = this.getLatLng();
      const dx = point.lng - center.lng;
      const dy = point.lat - center.lat;
      
      // Calculer l'angle en radians puis convertir en degrés
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Convertir pour obtenir un angle dans le sens horaire à partir du nord (0°)
      angle = (90 - angle) % 360;
      
      // Normaliser l'angle entre 0 et 360 degrés
      if (angle < 0) {
        angle += 360;
      }
      
      // Arrondir l'angle à l'entier le plus proche
      return Math.round(angle);
    });
  }
  
  /**
   * Met à jour une section existante
   */
  updateSection(sectionId: string, updates: Partial<CircleSection>): boolean {
    return performanceMonitor.measure('CircleWithSections.updateSection', () => {
      const sectionIndex = this._sections.findIndex(section => section.id === sectionId);
      
      if (sectionIndex !== -1) {
        // Valider le rayon si présent dans les mises à jour
        if (updates.radius !== undefined) {
          // S'assurer que le rayon est au moins 1
          updates.radius = Math.max(1, updates.radius);
          // Arrondir à l'entier inférieur
          updates.radius = Math.floor(updates.radius);
        }

        // Mettre à jour la section
        this._sections[sectionIndex] = {
          ...this._sections[sectionIndex],
          ...updates
        };
        
        // Normaliser les angles pour un cercle complet
        const section = this._sections[sectionIndex];
        if (updates.startAngle === 0 && updates.endAngle === 360) {
          // C'est un cercle complet, s'assurer que les angles sont exactement 0 et 360
          section.startAngle = 0;
          section.endAngle = 360;
        }
        
        // Mettre à jour les propriétés
        this.properties.sections = this._sections;
        
        // Re-rendre toutes les sections
        this._clearSections();
        this._sections.forEach(section => {
          this._renderSection(section);
        });
        
        // Émettre un événement pour notifier du changement
        this._emitCustomEvent('section:updated', {
          section: this._sections[sectionIndex],
          sections: this._sections
        });
        
        this.updateProperties();
        
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * Ajoute une nouvelle section au cercle
   */
  addSection(section: Partial<CircleSection> = {}): CircleSection {
    return performanceMonitor.measure('CircleWithSections.addSection', () => {
      const parentRadius = this.getRadius();
      
      // Calculer le rayon de la nouvelle section
      let radius;
      if (section.radius !== undefined) {
        radius = Math.max(1, section.radius); // S'assurer que le rayon est au moins 1
      } else {
        // Obtenir le rayon de la dernière section
        const lastSection = this._sections[this._sections.length - 1];
        if (lastSection) {
          // Réduire de 20 mètres par rapport à la section précédente
          radius = Math.max(lastSection.radius - 20, 20); // minimum 20 mètres
        } else {
          // Pour la première section, utiliser le rayon parent - 20
          radius = Math.max(parentRadius - 20, 20);
        }
      }

      // Créer la nouvelle section
      const newSection: CircleSection = {
        id: `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        startAngle: section.startAngle || 0,
        endAngle: section.endAngle || 45,
        radius: Math.floor(radius), // Arrondir à l'entier inférieur
        color: section.color || this._getRandomColor(),
        name: section.name || `Section ${this._sections.length + 1}`
      };
      
      this._sections.push(newSection);
      
      // Mettre à jour les propriétés
      this.properties.sections = this._sections;
      
      // Rendre la nouvelle section si la carte est disponible
      const map = this.getMap();
      if (map) {
        this._renderSection(newSection);
      }
      
      // Émettre un événement pour notifier du changement
      this._emitCustomEvent('section:added', {
        section: newSection,
        sections: this._sections
      });
      
      this.updateProperties();
      
      return newSection;
    });
  }
  
  /**
   * Supprime une section par son ID
   */
  removeSection(sectionId: string): boolean {
    return performanceMonitor.measure('CircleWithSections.removeSection', () => {
      const initialLength = this._sections.length;
      
      this._sections = this._sections.filter(section => section.id !== sectionId);
      
      if (initialLength !== this._sections.length) {
        // Mettre à jour les propriétés
        this.properties.sections = this._sections;
        
        // Re-rendre toutes les sections
        this._clearSections();
        this._sections.forEach(section => {
          this._renderSection(section);
        });
        
        // Émettre un événement pour notifier du changement
        this._emitCustomEvent('section:removed', {
          sectionId,
          sections: this._sections
        });
        
        this.updateProperties();
        
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * Convertit une section en cercle complet
   */
  makeFullCircle(section: CircleSection): void {
    performanceMonitor.measure('CircleWithSections.makeFullCircle', () => {
      section.startAngle = 0;
      section.endAngle = 360;
      
      // Re-rendre la section
      this._clearSections();
      this._renderSection(section);
      
      // Émettre un événement pour notifier du changement
      this._emitCustomEvent('section:updated', {
        section,
        sections: this._sections
      });
      
      this.updateProperties();
    });
  }
  
  /**
   * Récupère toutes les sections
   */
  getSections(): CircleSection[] {
    return performanceMonitor.measure('CircleWithSections.getSections', () => {
      return [...this._sections];
    });
  }
  
  /**
   * Surcharge de la méthode updateProperties pour inclure les sections
   */
  updateProperties(): void {
    performanceMonitor.measure('CircleWithSections.updateProperties', () => {
      const center = this.getLatLng();
      const radius = this.getRadius();
      
      // Calculer la surface totale couverte par les sections
      let totalSectionArea = 0;
      const updatedSections = this._sections.map(section => {
        // Calculer l'angle en radians
        const angleInRadians = ((section.endAngle - section.startAngle) * Math.PI) / 180;
        // Calculer la surface de la section
        const sectionArea = (angleInRadians / (2 * Math.PI)) * Math.PI * Math.pow(section.radius, 2);
        // Arrondir à 2 décimales
        const surface = Math.round(sectionArea * 100) / 100;
        totalSectionArea += sectionArea;
        
        return {
          ...section,
          surface
        };
      });

      this.properties = {
        type: 'CircleWithSections',
        radius: radius,
        diameter: radius * 2,
        surface: Math.PI * Math.pow(radius, 2),
        perimeter: 2 * Math.PI * radius,
        center: {
          lat: center.lat,
          lng: center.lng
        },
        sections: updatedSections,
        sectionArea: totalSectionArea,
        style: {
          ...this.properties?.style,
          color: this.options.color || '#3388ff',
          weight: this.options.weight || 3,
          opacity: this.options.opacity || 1,
          fillColor: this.options.fillColor || '#3388ff',
          fillOpacity: this.options.fillOpacity || 0.2,
          dashArray: (this.options as any)?.dashArray || '',
          name: this.properties?.style?.name || ''
        }
      };
      
      // Émettre un événement pour notifier les changements
      this.fire('properties:updated', {
        shape: this,
        properties: this.properties
      });
    });
  }
  
  /**
   * Crée une couleur aléatoire pour une section
   */
  protected _getRandomColor(): string {
    return performanceMonitor.measure('CircleWithSections._getRandomColor', () => {
      const colors = [
        '#3B82F6', // Bleu
        '#EF4444', // Rouge
        '#10B981', // Vert
        '#F59E0B', // Orange
        '#8B5CF6', // Violet
        '#EC4899', // Rose
        '#14B8A6', // Teal
        '#F97316', // Orange foncé
        '#6366F1', // Indigo
        '#84CC16'  // Lime
      ];
      
      // Utiliser une couleur qui n'est pas déjà utilisée si possible
      const usedColors = this._sections.map(section => section.color);
      const availableColors = colors.filter(color => !usedColors.includes(color));
      
      if (availableColors.length > 0) {
        return availableColors[Math.floor(Math.random() * availableColors.length)];
      }
      
      // Si toutes les couleurs sont utilisées, prendre une couleur aléatoire
      return colors[Math.floor(Math.random() * colors.length)];
    });
  }
  
  /**
   * Surcharge de setRadius pour mettre à jour également les sections
   */
  setRadius(radius: number): this {
    return performanceMonitor.measure('CircleWithSections.setRadius', () => {
      super.setRadius(radius);
      
      // Limiter les rayons des sections si nécessaire
      this._sections = this._sections.map(section => ({
        ...section,
        radius: Math.min(section.radius, radius)
      }));
      this._clearSections();
      this._initSections();
      
      return this;
    });
  }
  
  /**
   * Surcharge de setLatLng pour mettre à jour également les sections
   */
  setLatLng(latlng: L.LatLngExpression): this {
    return performanceMonitor.measure('CircleWithSections.setLatLng', () => {
      super.setLatLng(latlng);
      if (!this._isDragging) {
        this._clearSections();
        this._initSections();
      } else {
        this._renderSectionsPreview();
      }
      return this;
    });
  }

  /**
   * Obtient la carte sur laquelle le cercle est ajouté
   */
  protected getMap(): L.Map | null {
    return performanceMonitor.measure('CircleWithSections.getMap', () => {
      return this._map;
    });
  }

  /**
   * Affiche une prévisualisation des sections pendant le déplacement
   */
  protected _renderSectionsPreview(): void {
    performanceMonitor.measure('CircleWithSections._renderSectionsPreview', () => {
      const map = this.getMap();
      if (!map || !this._map) return;

      try {
        // Nettoyer les anciennes prévisualisations
        this._clearSections();

        // Créer des prévisualisations simplifiées des sections
        this._sections.forEach(section => {
          const isFullCircle = Math.abs(section.endAngle - section.startAngle) >= 360;
          
          if (isFullCircle) {
            try {
              // Pour un cercle complet, créer un cercle avec style simplifié
              const circle = new L.Circle(this.getLatLng(), {
                radius: section.radius,
                color: section.color,
                fillColor: section.color,
                fillOpacity: 0.2,
                weight: 1,
                dashArray: '5,5',
                interactive: false // Désactiver l'interactivité pendant la prévisualisation
              });
              
              if (map && map.hasLayer(this)) {
                circle.addTo(map);
                this._sectionLayers.push(circle as unknown as L.Polygon);
              }
            } catch (error) {
              console.warn('Erreur lors du rendu de la prévisualisation du cercle complet:', error);
            }
          } else {
            try {
              // Pour une section partielle, créer un polygone simplifié
              const points: L.LatLng[] = [];
              points.push(this.getLatLng());
              
              // Utiliser moins de points pour la prévisualisation
              const numPoints = 16;
              const angleRange = section.endAngle - section.startAngle;
              
              for (let i = 0; i <= numPoints; i++) {
                const angle = section.startAngle + (angleRange * i) / numPoints;
                const point = this._calculatePointOnCircle(angle, section.radius);
                points.push(point);
              }
              
              points.push(this.getLatLng());
              
              const sectionLayer = new L.Polygon(points, {
                color: section.color,
                fillColor: section.color,
                fillOpacity: 0.2,
                weight: 1,
                dashArray: '5,5',
                interactive: false // Désactiver l'interactivité pendant la prévisualisation
              });
              
              if (map && map.hasLayer(this)) {
                sectionLayer.addTo(map);
                this._sectionLayers.push(sectionLayer);
              }
            } catch (error) {
              console.warn('Erreur lors du rendu de la prévisualisation de la section partielle:', error);
            }
          }
        });
      } catch (error) {
        console.error('Erreur lors du rendu des prévisualisations:', error);
      }
    });
  }
  
  /**
   * Obtient le rayon minimal autorisé pour les sections (0)
   */
  getMinRadius(): number {
    return performanceMonitor.measure('CircleWithSections.getMinRadius', () => {
      return 1; // Cohérent avec l'interface qui a min="1"
    });
  }

  // Méthode auxiliaire pour émettre des événements personnalisés au niveau de la fenêtre
  private _emitCustomEvent(eventName: string, detail: any): void {
    performanceMonitor.measure('CircleWithSections._emitCustomEvent', () => {
      // Émettre un événement Leaflet standard
      this.fire(eventName, detail);
      
      // Émettre également un événement DOM personnalisé pour une meilleure interopérabilité
      const customEvent = new CustomEvent(eventName, { 
        detail,
        bubbles: true,
        cancelable: true 
      });
      
      window.dispatchEvent(customEvent);
      console.log(`[CircleWithSections] Événement émis: ${eventName}`, detail);
    });
  }
} 