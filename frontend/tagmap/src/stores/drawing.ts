import { defineStore } from 'pinia';
import api from '@/services/api';
import type {
  DrawingElement,
  RectangleData,
  PolygonData,
  ElevationLineData,
  LineData,
  DrawingElementType,
  AccessLevel,
  ElementCategory,
  NoteData
} from '@/types/drawing';
import L from 'leaflet';
import { Polygon } from '@/utils/Polygon';
import { Line } from '@/utils/Line';
import { Rectangle } from '@/utils/Rectangle';
import { GeoNote } from '@/utils/GeoNote';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

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
  performanceMonitor: ReturnType<typeof usePerformanceMonitor>;
}

// TextData function removed as per requirements

function isPolygonData(data: any): data is PolygonData {
  return data && Array.isArray(data.points) && data.points.length > 0 &&
         Array.isArray(data.points[0]) && data.points[0].length === 2;
}

function isElevationData(data: any): data is ElevationLineData {
  if (!data || typeof data !== 'object') {
    console.log('[DrawingStore] ElevationData invalide: pas un objet', { data });
    return false;
  }

  const hasValidPoints = Array.isArray(data.points) &&
                        data.points.length > 0 &&
                        Array.isArray(data.points[0]) &&
                        data.points[0].length === 2;

  const hasValidStyle = typeof data.style === 'object' && data.style !== null;

  const hasValidElevationData = !data.elevationData ||
                               (Array.isArray(data.elevationData) &&
                                data.elevationData.every((point: any) =>
                                  typeof point === 'object' &&
                                  'distance' in point &&
                                  'elevation' in point));

  return hasValidPoints && hasValidStyle && hasValidElevationData;
}

function isLineData(data: any): data is LineData {
  return data && Array.isArray(data.points) && data.points.length > 0 &&
         Array.isArray(data.points[0]) && data.points[0].length === 2;
}

// Note data type removed as per requirements

function convertShapeToDrawingElement(shape: any): DrawingElement {
  console.log('[DrawingStore] Conversion de la forme en élément', {
    type: shape.properties?.type,
    name: shape.properties?.style?.name,
    properties: shape.properties
  });

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
  console.log('[DrawingStore] Conversion de l\'élément stocké en forme', { element });

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
      console.log('[DrawingStore] Polygon - Niveau d\'accès récupéré:', accessLevel, 'Style:', data.style);

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
      console.log('[DrawingStore] Line - Niveau d\'accès récupéré:', accessLevel, 'Style:', data.style);

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

    case 'Rectangle': {
      const data = element.data as RectangleData;
      console.log('[DrawingStore][convertStoredElementToShape] Restauration Rectangle:', {
        data,
        bounds: data.bounds,
        width: data.width,
        height: data.height,
        rotation: data.rotation
      });
      if (!data.bounds) {
        console.error('[DrawingStore] Données de bounds manquantes pour Rectangle');
        return null;
      }

      const bounds = new L.LatLngBounds(
        L.latLng(data.bounds.southWest[1], data.bounds.southWest[0]),
        L.latLng(data.bounds.northEast[1], data.bounds.northEast[0])
      );

      const rectangle = new Rectangle(bounds, {
        color: data.style?.color || '#2b6451',
        weight: data.style?.weight || 3,
        opacity: data.style?.opacity || 1,
        fillColor: data.style?.fillColor || '#2b6451',
        fillOpacity: data.style?.fillOpacity || 0.2,
        dashArray: data.style?.dashArray || '',
        name: data.style?.name || '',
        width: data.width,
        height: data.height
      });

      // Appliquer la rotation si elle existe
      if (data.rotation) {
        rectangle.setRotation(data.rotation);
      }

      console.log('[DrawingStore][convertStoredElementToShape] Rectangle restauré:', {
        bounds: rectangle.getBounds(),
        dimensions: rectangle.getDimensions(),
        properties: rectangle.properties
      });

      return rectangle;
    }

    case 'Circle': {
      console.log('[DrawingStore] Traitement d\'un Circle à partir de l\'API', {
        id: element.id,
        data: element.data,
        hasName: element.data?.style?.name !== undefined,
        name: element.data?.style?.name
      });

      const data = element.data as CircleData;
      if (!data.center || !data.radius) {
        console.error('[DrawingStore] Données invalides pour Circle');
        return null;
      }

      // Création du cercle
      const circle = L.circle(
        [data.center[1], data.center[0]],
        {
          color: data.style?.color || '#2b6451',
          weight: data.style?.weight || 3,
          opacity: data.style?.opacity || 1,
          fillColor: data.style?.fillColor || '#2b6451',
          fillOpacity: data.style?.fillOpacity || 0.2,
          dashArray: data.style?.dashArray || '',
          radius: data.radius
        }
      );

      // Définition des propriétés du cercle
      (circle as any).properties = {
        type: 'Circle',
        radius: data.radius,
        diameter: data.radius * 2,
        surface: Math.PI * data.radius * data.radius,
        perimeter: 2 * Math.PI * data.radius,
        style: {
          ...(data.style || {}),
          name: data.style?.name || ''
        }
      };

      console.log('[DrawingStore] Cercle créé:', {
        centerType: typeof data.center,
        center: data.center,
        radius: data.radius,
        style: (circle as any).properties.style,
        name: (circle as any).properties.style.name
      });

      return circle;
    }

    case 'Note': {
      console.log('[DrawingStore] Traitement d\'une Note à partir de l\'API', {
        id: element.id,
        data: element.data
      });

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

        console.log('[DrawingStore] Données préparées pour la note:', noteData);

        // Utiliser la méthode statique de GeoNote pour créer une note à partir des données
        const geoNote = GeoNote.fromBackendData(noteData);

        // Stocker l'ID de la base de données pour la sauvegarde ultérieure
        (geoNote as any)._dbId = element.id;

        console.log('[DrawingStore] Note créée:', {
          id: element.id,
          location: noteData.location,
          name: noteData.name,
          type: (geoNote as any).properties.type
        });

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
        ElevationLine: true,
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
    lastUsedType: null,
    performanceMonitor: usePerformanceMonitor()
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
        console.log('[DrawingStore][getFilteredElements] Aucun élément dans le store, retour d\'un tableau vide');
        return [];
      }

      console.log('[DrawingStore][getFilteredElements] Début du filtrage avec', {
        totalElements: state.elements.length,
        filters: JSON.stringify({
          accessLevels: state.filters.accessLevels,
          categories: state.filters.categories,
          shapeTypes: state.filters.shapeTypes
        })
      });

      // Afficher tous les éléments du store pour débogage
      console.log('[DrawingStore][getFilteredElements] Éléments dans le store:',
        state.elements.map(e => ({
          id: e.id,
          type_forme: e.type_forme,
          data: e.data ? JSON.stringify(e.data) : null
        }))
      );

      const filteredElements = state.elements.filter(element => {
        // Informations de base sur l'élément pour le débogage
        console.log(`[DrawingStore][getFilteredElements] Vérification de l'élément ${element.id} (${element.type_forme})`);

        // Extraire les propriétés pour le filtrage

        // Vérifier si le type de forme est activé dans les filtres
        const typeVisible = element.type_forme in state.filters.shapeTypes ?
          state.filters.shapeTypes[element.type_forme] : true;

        if (!typeVisible) {
          console.log(`[DrawingStore][getFilteredElements] Élément ${element.id} filtré par type: ${element.type_forme} (non visible)`);
          return false;
        }

        // Vérifier si la catégorie est activée dans les filtres
        // Utiliser une catégorie par défaut si non spécifiée
        const category = (element.data as any)?.category || 'default';
        const categoryVisible = category in state.filters.categories ?
          state.filters.categories[category] : true;

        if (!categoryVisible) {
          console.log(`[DrawingStore][getFilteredElements] Élément ${element.id} filtré par catégorie: ${category} (non visible)`);
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
          console.log(`[DrawingStore][getFilteredElements] Élément ${element.id} filtré par niveau d'accès: ${accessLevel} (non visible)`);
          return false;
        }

        console.log(`[DrawingStore][getFilteredElements] Élément ${element.id} visible: type=${element.type_forme}, catégorie=${category}, accès=${accessLevel}`);
        return true;
      });

      console.log('[DrawingStore][getFilteredElements] Résultat du filtrage:', {
        total: state.elements.length,
        filtered: filteredElements.length,
        filteredIds: filteredElements.map(e => e.id)
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
          ElevationLine: true,
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
      const endMeasure = this.performanceMonitor.startMeasure('addElement', 'DrawingStore');
      try {
        console.log('[DrawingStore] Ajout d\'un élément', {
          element,
          isLeafletLayer: element instanceof L.Layer,
          hasProperties: !!element.properties,
          properties: element.properties,
          type: element.properties?.type
        });

        if (element instanceof L.Layer && element.properties) {
          const convertedElement = this.performanceMonitor.measure(
            'addElement_convert',
            () => convertShapeToDrawingElement(element),
            'DrawingStore'
          );
          console.log('[DrawingStore] Élément converti avant ajout', {
            original: element,
            converted: convertedElement,
            type: convertedElement.type_forme,
            data: convertedElement.data
          });
          this.elements.push(convertedElement);
        } else {
          if (!element.type_forme && this.lastUsedType) {
            element.type_forme = this.lastUsedType;
          }
          this.elements.push(element);
        }

        this.unsavedChanges = true;
      } finally {
        endMeasure();
      }
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
      if (['CERCLE', 'RECTANGLE', 'DEMI_CERCLE', 'LIGNE', 'TEXTE'].includes(tool)) {
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
      const endMeasure = this.performanceMonitor.startMeasure('loadPlanElements', 'DrawingStore');

      // Si le plan est déjà chargé avec des éléments, ne pas recharger
      if (this.currentMapId === planId && this.elements.length > 0) {
        console.log(`[ISSUE01][DrawingStore] Plan ${planId} déjà chargé avec ${this.elements.length} éléments, ne pas recharger`);
        endMeasure();
        return this.elements;
      }

      this.loading = true;
      try {
        console.log('[ISSUE01][DrawingStore] Début du chargement du plan', { 
          planId,
          currentMapId: this.currentMapId,
          currentElements: this.elements.length
        });
        const response = await this.performanceMonitor.measureAsync(
          'loadPlanElements_apiCall',
          () => api.get(`/plans/${planId}/`),
          'DrawingStore'
        );
        const plan = response.data;
        console.log('[ISSUE01][DrawingStore] Données du plan reçues', {
          formesCount: plan.formes?.length || 0,
          preferences: plan.preferences
        });

        // Analyse détaillée des formes reçues
        if (plan.formes && Array.isArray(plan.formes)) {
          plan.formes.forEach((forme: any, index: number) => {
            console.log(`[ISSUE01][DrawingStore] Analyse détaillée forme ${index}:`, {
              id: forme.id,
              type_forme: forme.type_forme,
              hasData: !!forme.data,
              dataKeys: forme.data ? Object.keys(forme.data) : [],
              name: forme.data?.name
            });
          });
        }

        // Convertir les formes en éléments de dessin
        this.elements = plan.formes.map((forme: any) => {
          console.log('[ISSUE01][DrawingStore] Traitement de la forme stockée', {
            id: forme.id,
            type_forme: forme.type_forme
          });
          // Si la forme a déjà été convertie en élément de dessin
          if (forme.type_forme) {
            console.log('[ISSUE01][DrawingStore] Forme déjà au format élément', {
              type_forme: forme.type_forme,
              id: forme.id
            });
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
              console.log('[ISSUE01][DrawingStore] Forme convertie avec succès', {
                originalType: forme.type_forme,
                convertedType: convertedShape.type,
                id: forme.id
              });
              return convertShapeToDrawingElement(convertedShape);
            }
          } catch (error) {
            console.error('[ISSUE01][DrawingStore] Erreur lors de la conversion de la forme', {
              error,
              id: forme.id,
              type: forme.type_forme
            });
          }
          // En cas d'échec, retourner la forme telle quelle
          console.warn('[ISSUE01][DrawingStore] Utilisation de la forme sans conversion', {
            type_forme: forme.type_forme,
            id: forme.id
          });
          return forme;
        });
        console.log(`[ISSUE01][DrawingStore] Plan ${planId} - Chargé ${this.elements.length} éléments`, {
          elementsIds: this.elements.map(el => el.id)
        });
        this.currentMapId = planId;
        this.unsavedChanges = false;
        // Charger les préférences du plan
        if (plan.preferences) {
          console.log('[ISSUE01][DrawingStore] Chargement des préférences', plan.preferences);
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
        console.error('[ISSUE01][DrawingStore] Erreur lors du chargement des éléments:', error);
        this.error = 'Erreur lors du chargement des éléments du plan';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },
    async saveToPlan(planId?: number, options?: { elementsToDelete?: number[] }) {
      const endMeasure = this.performanceMonitor.startMeasure('saveToPlan', 'DrawingStore');
      this.loading = true;
      try {
        const targetPlanId = planId || this.currentMapId;
        console.log('[ISSUE01][DrawingStore][saveToPlan] Début de la sauvegarde', {
          targetPlanId,
          currentPlanId: this.currentMapId,
          elementsCount: this.elements.length,
          elementsIds: this.elements.map(el => el.id),
          elementsToDelete: options?.elementsToDelete
        });

        if (!targetPlanId) {
          throw new Error('Aucun plan sélectionné pour la sauvegarde');
        }

        const formesAvecType = this.performanceMonitor.measure(
          'saveToPlan_prepareElements',
          () => this.elements.map(element => ({
            ...element,
            type_forme: element.type_forme || this.lastUsedType
          })),
          'DrawingStore'
        );

        console.log('[ISSUE01][DrawingStore][saveToPlan] Formes préparées pour sauvegarde:', {
          formesCount: formesAvecType.length,
          formesIds: formesAvecType.map(el => el.id)
        });

        const elementsToDelete = options?.elementsToDelete || [];
        const requestUrl = `/plans/${targetPlanId}/save_with_elements/`;

        const response = await this.performanceMonitor.measureAsync(
          'saveToPlan_apiCall',
          () => api.post(requestUrl, {
            formes: formesAvecType,
            connexions: [],
            annotations: [],
            elementsToDelete: elementsToDelete,
            preferences: {
              currentTool: this.currentTool,
              currentStyle: this.currentStyle,
              lastUsedType: this.lastUsedType
            }
          }),
          'DrawingStore'
        );

        console.log('[ISSUE01][DrawingStore][saveToPlan] Réponse reçue du serveur:', {
          formesCount: response.data.formes?.length || 0,
          formesIds: response.data.formes?.map((f: any) => f.id) || []
        });
        
        // Log supplémentaire pour investigation
        console.log('[ISSUE01][DrawingStore][saveToPlan] Détail de la réponse du serveur:', {
          requestFormeCount: formesAvecType.length,
          responseFormeCount: response.data.formes?.length || 0,
          formesDuplicates: response.data.formes
            ?.map((f: any) => f.id)
            .filter((id: number, index: number, self: number[]) => self.indexOf(id) !== index),
          detailedResponseFormes: response.data.formes?.map((f: any) => ({
            id: f.id,
            type: f.type_forme,
            pointCount: f.data && f.data.points ? f.data.points.length : 'N/A'
          })),
          requestBody: {
            formesCount: formesAvecType.length,
            formesTypes: formesAvecType.map(el => el.type_forme),
            formesIds: formesAvecType.map(el => el.id),
            elementsToDelete
          }
        });

        this.elements = this.performanceMonitor.measure(
          'saveToPlan_processResponse',
          () => {
            // Filtrer les éléments supprimés de la réponse
            const deletedIds = new Set(elementsToDelete);
            return response.data.formes
              .filter((forme: any) => !deletedIds.has(forme.id))
              .map((forme: any) => ({
                ...forme,
                type_forme: forme.type_forme
              }));
          },
          'DrawingStore'
        );

        console.log('[ISSUE01][DrawingStore][saveToPlan] Éléments après filtrage:', {
          totalElements: this.elements.length,
          elementsIds: this.elements.map(el => el.id),
          elementsToDelete: elementsToDelete
        });

        this.unsavedChanges = false;
        return response.data;
      } catch (error) {
        console.error('[ISSUE01][DrawingStore][saveToPlan] ERREUR:', error);
        console.error('[ISSUE01][DrawingStore][saveToPlan] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        this.error = 'Erreur lors de la sauvegarde du plan';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    }
  }
});