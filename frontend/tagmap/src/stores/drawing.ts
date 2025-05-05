import { defineStore } from 'pinia';
import api from '@/services/api';
import type {
  DrawingElement,
  PolygonData,
  LineData,
  DrawingElementType,
  AccessLevel,
  ElementCategory,
  NoteData
} from '@/types/drawing';
import L from 'leaflet';
import { Polygon } from '@/utils/Polygon';
import { Line } from '@/utils/Line';
import { GeoNote } from '@/utils/GeoNote';

// Interface pour les filtres de la carte
interface MapFilters {
  accessLevels: {
    company: boolean;
    employee: boolean;
    visitor: boolean;
  };
  categories: {
    [key: string]: boolean;
  };
  shapeTypes: {
    [key: string]: boolean;
  };
}

interface DrawingState {
  currentMapId: number | null;
  elements: DrawingElement[];
  selectedElement: DrawingElement | null;
  unsavedChanges: boolean;
  loading: boolean;
  error: string | null;
  currentTool: string;
  filters: MapFilters;
  currentStyle: {
    strokeStyle?: string;
    strokeWidth?: number;
    strokeColor?: string;
    fillColor?: string;
    fillOpacity?: number;
  };
  lastUsedType: string | null;
}

// TextData function removed as per requirements

function isPolygonData(data: any): data is PolygonData {
  return data && Array.isArray(data.points) && data.points.length > 0 &&
         Array.isArray(data.points[0]) && data.points[0].length === 2;
}


function isLineData(data: any): data is LineData {
  return data && Array.isArray(data.points) && data.points.length > 0 &&
         Array.isArray(data.points[0]) && data.points[0].length === 2;
}

// Note data type removed as per requirements

function convertShapeToDrawingElement(shape: any): DrawingElement {

  // Vérifier si c'est une note géolocalisée
  if (shape.properties?.type === 'Note') {
    const latLng = shape.getLatLng();
    // Convertir en PolygonData pour compatibilité
    const data: PolygonData = {
      points: [[latLng.lng, latLng.lat]],
      style: {
        color: shape.properties.style?.color || '#2b6451',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        fillColor: shape.properties.style?.fillColor || '#2b6451',
        fillOpacity: shape.properties.style?.fillOpacity || 0.2,
        name: shape.properties.style?.name || ''
      }
    };
    return { type_forme: 'Note' as DrawingElementType, data };
  }

  // Vérifier si c'est un polygone
  if (shape instanceof Polygon || shape.properties?.type === 'Polygon') {
    const latLngs = shape.getLatLngs()[0] as L.LatLng[];
    const data: PolygonData = {
      points: latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]),
      style: {
        color: shape.properties.style?.color || '#2b6451',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        fillColor: shape.properties.style?.fillColor || '#2b6451',
        fillOpacity: shape.properties.style?.fillOpacity || 0.2,
        name: shape.properties.style?.name || ''
      },
      category: shape.properties.category || 'forages',
      accessLevel: shape.properties.accessLevel || 'visitor',
      // area is calculated dynamically
    };
    return { type_forme: 'Polygon', data };
  }

  // Vérifier si c'est une ligne
  if (shape instanceof Line || shape.properties?.type === 'Line') {
    const latLngs = shape.getLatLngs() as L.LatLng[];
    const data: LineData = {
      points: latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]),
      category: shape.properties.category || 'forages',
      accessLevel: shape.properties.accessLevel || 'visitor',
      style: {
        color: shape.properties.style?.color || '#2b6451',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        name: shape.properties.style?.name || ''
      },
      // length is calculated dynamically
    };
    return { type_forme: 'Line', data };
  }

  throw new Error('Type de forme non reconnu');
}

function convertStoredElementToShape(element: DrawingElement): any {

  switch (element.type_forme) {
    case 'Polygon': {
      const data = element.data;
      if (!isPolygonData(data)) {
        console.error('[DrawingStore] Données invalides pour Polygon');
        return null;
      }

      const points = data.points.map((point: [number, number]) =>
        L.latLng(point[1], point[0])
      );

      // Récupérer le niveau d'accès depuis le style si disponible
      const accessLevel = (data.style as any)?._accessLevel || (data.style as any)?.accessLevel || data.accessLevel || 'visitor';

      // Forcer la mise à jour du niveau d'accès dans les données
      data.accessLevel = accessLevel;

      const polygon = new Polygon([points], {
        color: data.style?.color || '#2b6451',
        weight: data.style?.weight || 3,
        opacity: data.style?.opacity || 1,
        fillColor: data.style?.fillColor || '#2b6451',
        fillOpacity: data.style?.fillOpacity || 0.2,
        dashArray: data.style?.dashArray || '',
        name: data.style?.name || '',
        category: data.category || 'forages',
        accessLevel: accessLevel
      });

      polygon.updateProperties();

      return polygon;
    }

    case 'Line': {
      const data = element.data;
      if (!isLineData(data)) {
        console.error('[DrawingStore] Données invalides pour Ligne');
        return null;
      }

      const points = data.points.map((point: [number, number]) =>
        L.latLng(point[1], point[0])
      );

      // Récupérer le niveau d'accès depuis le style si disponible
      const accessLevel = (data.style as any)?._accessLevel || (data.style as any)?.accessLevel || data.accessLevel || 'visitor';

      // Forcer la mise à jour du niveau d'accès dans les données
      data.accessLevel = accessLevel;

      const line = new Line(points, {
        ...(data.style || {}),
        name: data.style?.name || '',
        category: data.category || 'forages',
        accessLevel: accessLevel
      });

      line.updateProperties();
      return line;
    }
    case 'Note': {

      const data = element.data as any;
      if (!data.location) {
        console.error('[DrawingStore] Données invalides pour Note');
        return null;
      }

      try {
        // Préparer les données pour la création de la note
        const noteData: NoteData = {
          location: data.location,
          name: data.name || 'Note géolocalisée',
          description: data.description || '',
          columnId: data.columnId || 'en-cours',
          accessLevel: data.accessLevel || 'private',
          category: data.category || 'forages',
          style: {
            color: data.style?.color || '#2b6451',
            weight: data.style?.weight || 2,
            fillColor: data.style?.fillColor || '#2b6451',
            fillOpacity: data.style?.fillOpacity || 0.8,
            radius: data.style?.radius || 12
          },
          comments: data.comments || [],
          photos: data.photos || [],
          order: data.order || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };

  
        // Utiliser la méthode statique de GeoNote pour créer une note à partir des données
        const geoNote = GeoNote.fromBackendData(noteData);

        // Stocker l'ID de la base de données pour la sauvegarde ultérieure
        (geoNote as any)._dbId = element.id;


        return geoNote;
      } catch (error) {
        console.error('[DrawingStore] Erreur lors de la création de la Note:', error);
        return null;
      }
    }

    default:
      console.warn('[DrawingStore] Type non géré pour la restauration:', element.type_forme);
      return null;
  }
}

export const useDrawingStore = defineStore('drawing', {
  state: (): DrawingState => ({
    currentMapId: null,
    elements: [],
    selectedElement: null,
    unsavedChanges: false,
    loading: false,
    error: null,
    currentTool: '',
    filters: {
      accessLevels: {
        company: true,
        employee: true,
        visitor: true
      },
      categories: {
        forages: true,
        clients: true,
        entrepots: true,
        livraisons: true,
        cultures: true,
        parcelles: true
      },
      shapeTypes: {
        Polygon: true,
        Line: true,
        Note: true
      }
    },
    currentStyle: {
      strokeStyle: 'solid',
      strokeWidth: 2,
      strokeColor: '#2563EB',
      fillColor: '#3B82F6',
      fillOpacity: 0.2
    },
    lastUsedType: null
  }),
  getters: {
    hasUnsavedChanges: (state) => state.unsavedChanges,
    getCurrentElements: (state) => state.elements,
    getSelectedElement: (state) => state.selectedElement,
    getCurrentTool: (state) => state.currentTool,
    getCurrentStyle: (state) => state.currentStyle,
    getLastUsedType: (state) => state.lastUsedType,
    getFilters: (state) => state.filters,
    // Getter pour obtenir les éléments filtrés selon les critères actuels
    getFilteredElements: (state) => {
      // Si aucun élément dans le store, retourner un tableau vide
      if (state.elements.length === 0) {
        return [];
      }


      const filteredElements = state.elements.filter(element => {

        // Extraire les propriétés pour le filtrage

        // Vérifier si le type de forme est activé dans les filtres
        const typeVisible = element.type_forme in state.filters.shapeTypes ?
          state.filters.shapeTypes[element.type_forme] : true;

        if (!typeVisible) {
          return false;
        }

        // Vérifier si la catégorie est activée dans les filtres
        // Utiliser une catégorie par défaut si non spécifiée
        const category = (element.data as any)?.category || 'default';
        const categoryVisible = category in state.filters.categories ?
          state.filters.categories[category] : true;

        if (!categoryVisible) {
          return false;
        }

        // Vérifier si le niveau d'accès est activé dans les filtres
        // Utiliser 'visitor' comme niveau d'accès par défaut
        const accessLevel = (element.data as any)?.accessLevel || 'visitor';
        let accessLevelVisible = true; // Par défaut visible

        if (accessLevel === 'company') {
          accessLevelVisible = state.filters.accessLevels.company;
        } else if (accessLevel === 'employee') {
          accessLevelVisible = state.filters.accessLevels.employee;
        } else if (accessLevel === 'visitor') {
          accessLevelVisible = state.filters.accessLevels.visitor;
        }

        if (!accessLevelVisible) {
          return false;
        }

        return true;
      });


      return filteredElements;
    }
  },
  actions: {
    setCurrentPlan(planId: number | null) {
      // Émettre un événement personnalisé pour nettoyer les points de contrôle
      window.dispatchEvent(new CustomEvent('clearControlPoints'));
      this.currentMapId = planId;
      if (planId === null) {
        this.clearElements();
      }
      // Réinitialiser l'état du dessin
      this.selectedElement = null;
      this.unsavedChanges = false;
      this.currentTool = '';
      this.lastUsedType = null;
      this.currentStyle = {
        strokeStyle: 'solid',
        strokeWidth: 2,
        strokeColor: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.2
      };
      // Réinitialiser les filtres
      this.filters = {
        accessLevels: {
          company: true,
          employee: true,
          visitor: true
        },
        categories: {
          forages: true,
          clients: true,
          entrepots: true,
          livraisons: true,
          cultures: true,
          parcelles: true
        },
        shapeTypes: {
          Polygon: true,
          Line: true,
          Note: true
        }
      };
    },
    clearCurrentPlan() {
      // Ne réinitialiser que si nécessaire
      if (this.currentMapId !== null || this.elements.length > 0) {
        this.currentMapId = null;
        this.elements = [];
        this.selectedElement = null;
        this.unsavedChanges = false;
        this.loading = false;
        this.error = null;
      }
    },
    clearElements() {
      this.elements = [];
      this.selectedElement = null;
      this.unsavedChanges = false;
      this.error = null;
    },
    addElement(element: DrawingElement | any) {
      if (element instanceof L.Layer && element.properties) {
        const convertedElement = convertShapeToDrawingElement(element);
        this.elements.push(convertedElement);
      } else {
        if (!element.type_forme && this.lastUsedType) {
          element.type_forme = this.lastUsedType;
        }
        this.elements.push(element);
      }

      this.unsavedChanges = true;
    },
    updateElement(element: DrawingElement) {
      const index = this.elements.findIndex(e => e.id === element.id);
      if (index !== -1) {
        const type_forme = this.elements[index].type_forme;
        this.elements[index] = { ...element, type_forme };
        this.unsavedChanges = true;
      }
    },
    removeElement(elementId: number) {
      const index = this.elements.findIndex(e => e.id === elementId);
      if (index !== -1) {
        this.elements.splice(index, 1);
        this.unsavedChanges = true;
      }
    },
    selectElement(element: DrawingElement | null) {
      this.selectedElement = element;
    },
    setCurrentTool(tool: string) {
      this.currentTool = tool;
      if (['CERCLE', 'RECTANGLE', 'DEMI_CERCLE', 'LIGNE'].includes(tool)) {
        this.lastUsedType = tool;
      }
    },
    setCurrentStyle(style: Partial<DrawingState['currentStyle']>) {
      // Si aucun style n'est fourni, réinitialiser aux valeurs par défaut
      if (!style || Object.keys(style).length === 0) {
        this.currentStyle = {
          strokeStyle: 'solid',
          strokeWidth: 2,
          strokeColor: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.2
        };
        return;
      }

      // Sinon, mettre à jour uniquement les propriétés fournies
      this.currentStyle = { ...this.currentStyle, ...style };
    },

    // Mettre à jour les filtres de la carte
    updateFilters(filters: {
      accessLevels?: { company?: boolean; employee?: boolean; visitor?: boolean };
      categories?: { [key: string]: boolean };
      shapeTypes?: { [key: string]: boolean };
    }) {
      // Mettre à jour les niveaux d'accès si fournis
      if (filters.accessLevels) {
        const oldAccessLevels = { ...this.filters.accessLevels };
        this.filters.accessLevels = {
          ...this.filters.accessLevels,
          ...filters.accessLevels
        };
      }

      // Mettre à jour les catégories si fournies
      if (filters.categories) {
        const oldCategories = { ...this.filters.categories };
        this.filters.categories = {
          ...this.filters.categories,
          ...filters.categories
        };
        // Vérifier si des catégories ont été activées ou désactivées
        const changedCategories = Object.keys(filters.categories).filter(key =>
          oldCategories[key] !== this.filters.categories[key]
        );

        if (changedCategories.length > 0) {
          // Si des catégories ont été réactivées, s'assurer que les éléments conservent leur catégorie d'origine
          const reactivatedCategories = changedCategories.filter(key =>
            oldCategories[key] === false && this.filters.categories[key] === true
          );

          if (reactivatedCategories.length > 0) {
            // Émettre un événement spécifique pour la réactivation des catégories
            window.dispatchEvent(new CustomEvent('categoriesReactivated', {
              detail: {
                categories: reactivatedCategories
              }
            }));
          }
        }
      }

      // Mettre à jour les types de formes si fournis
      if (filters.shapeTypes) {
        const oldShapeTypes = { ...this.filters.shapeTypes };
        this.filters.shapeTypes = {
          ...this.filters.shapeTypes,
          ...filters.shapeTypes
        };
        // Vérifier si des types de formes ont été activés ou désactivés
        const changedShapeTypes = Object.keys(filters.shapeTypes).filter(key =>
          oldShapeTypes[key] !== this.filters.shapeTypes[key]
        );

        if (changedShapeTypes.length > 0) {
          // Si des types de formes ont été réactivés, s'assurer que les éléments conservent leur type d'origine
          const reactivatedShapeTypes = changedShapeTypes.filter(key =>
            oldShapeTypes[key] === false && this.filters.shapeTypes[key] === true
          );

          if (reactivatedShapeTypes.length > 0) {
            // Émettre un événement spécifique pour la réactivation des types de formes
            window.dispatchEvent(new CustomEvent('shapeTypesReactivated', {
              detail: {
                shapeTypes: reactivatedShapeTypes
              }
            }));
          }
        }
      }
      // Émettre un événement pour indiquer que les filtres ont changé
      window.dispatchEvent(new CustomEvent('filtersChanged', {
        detail: {
          filters: this.filters
        }
      }));
    },
    async loadPlanElements(planId: number) {
      // Si le plan est déjà chargé avec des éléments, ne pas recharger
      if (this.currentMapId === planId && this.elements.length > 0) {
        return this.elements;
      }

      this.loading = true;
      try {
        const response = await api.get(`/plans/${planId}/`);
        const plan = response.data;

        // Convertir les formes en éléments de dessin
        this.elements = plan.formes.map((forme: any) => {
          // Si la forme a déjà été convertie en élément de dessin
          if (forme.type_forme) {
            return {
              id: forme.id,
              type_forme: forme.type_forme,
              data: forme.data || {}
            };
          }
          // Sinon, tenter de convertir la forme
          try {
            const convertedShape = convertStoredElementToShape(forme);
            if (convertedShape) {
              return convertShapeToDrawingElement(convertedShape);
            }
          } catch (error) {
            console.error('Erreur lors de la conversion de la forme', {
              error,
              id: forme.id,
              type: forme.type_forme
            });
          }
          // En cas d'échec, retourner la forme telle quelle
          return forme;
        });
        this.currentMapId = planId;
        this.unsavedChanges = false;
        // Charger les préférences du plan
        if (plan.preferences) {
          if (plan.preferences.currentTool) {
            this.setCurrentTool(plan.preferences.currentTool);
          }
          if (plan.preferences.currentStyle) {
            this.currentStyle = { ...this.currentStyle, ...plan.preferences.currentStyle };
          }
          if (plan.preferences.lastUsedType) {
            this.lastUsedType = plan.preferences.lastUsedType;
          }
        }
        return this.elements;
      } catch (error) {
        console.error('Erreur lors du chargement des éléments:', error);
        this.error = 'Erreur lors du chargement des éléments du plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async saveToPlan(planId?: number, options?: { elementsToDelete?: number[] }) {
      this.loading = true;
      try {
        const targetPlanId = planId || this.currentMapId;

        if (!targetPlanId) {
          throw new Error('Aucun plan sélectionné pour la sauvegarde');
        }

        const formesAvecType = this.elements.map(element => ({
          ...element,
          type_forme: element.type_forme || this.lastUsedType
        }));

        const elementsToDelete = options?.elementsToDelete || [];
        const requestUrl = `/plans/${targetPlanId}/save_with_elements/`;

        const response = await api.post(requestUrl, {
          formes: formesAvecType,
          connexions: [],
          annotations: [],
          elementsToDelete: elementsToDelete,
          preferences: {
            currentTool: this.currentTool,
            currentStyle: this.currentStyle,
            lastUsedType: this.lastUsedType
          }
        });

        // Filtrer les éléments supprimés de la réponse
        const deletedIds = new Set(elementsToDelete);
        this.elements = response.data.formes
          .filter((forme: any) => !deletedIds.has(forme.id))
          .map((forme: any) => ({
            ...forme,
            type_forme: forme.type_forme
          }));

        this.unsavedChanges = false;
        return response.data;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du plan:', error);
        this.error = 'Erreur lors de la sauvegarde du plan';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});