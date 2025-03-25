import { defineStore } from 'pinia';
import api from '@/services/api';
import type { 
  DrawingElement, 
  TextData, 
  ShapeData, 
  RectangleData, 
  PolygonData,
  ElevationLineData,
  LineData,
  DrawingElementType,
  SemicircleData,
  CircleData,
  NoteData
} from '@/types/drawing';
import L from 'leaflet';
import { TextRectangle } from '@/utils/TextRectangle';
import { Polygon } from '@/utils/Polygon';
import { ElevationLine } from '@/utils/ElevationLine';
import { Line } from '@/utils/Line';
import { CircleArc } from '@/utils/CircleArc';
import { Rectangle } from '@/utils/Rectangle';
import { CircleWithSections, type CircleSection } from '@/utils/CircleWithSections';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

// Définir le type pour les données des cercles avec sections
interface CircleWithSectionsData extends CircleData {
  sections: CircleSection[];
}

// Interface pour les notes géolocalisées
interface NoteData {
  location: [number, number];
  title: string;
  description: string;
  visibility: 'private' | 'enterprise' | 'employee' | 'visitor';
  attachments: string[];
  style: {
    color: string;
    weight: number;
    opacity: number;
    fillColor: string;
    fillOpacity: number;
    name: string;
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

function isTextData(data: ShapeData): data is TextData {
  return 'content' in data && 'bounds' in data;
}

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

function isNoteData(data: ShapeData): data is NoteData {
  return 'title' in data && 'description' in data && 'visibility' in data;
}

function convertShapeToDrawingElement(shape: any): DrawingElement {
  console.log('[DrawingStore] Conversion de la forme en élément', { 
    type: shape.properties?.type,
    name: shape.properties?.style?.name,
    properties: shape.properties
  });

  // Vérifier si c'est une note géolocalisée
  if (shape.properties?.type === 'Note') {
    const latLng = shape.getLatLng();
    const data: NoteData = {
      location: [latLng.lng, latLng.lat],
      title: shape.properties.title || '',
      description: shape.properties.description || '',
      visibility: shape.properties.visibility || 'private',
      attachments: shape.properties.attachments || [],
      style: {
        color: shape.properties.style?.color || '#3388ff',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        fillColor: shape.properties.style?.fillColor || '#3388ff',
        fillOpacity: shape.properties.style?.fillOpacity || 0.2,
        name: shape.properties.style?.name || ''
      }
    };
    return { type_forme: 'Note' as DrawingElementType, data };
  }

  // Vérifier si c'est une ElevationLine
  if (shape instanceof ElevationLine || shape.properties?.type === 'ElevationLine') {
    const latLngsElevation = shape.getLatLngs() as L.LatLng[];
    const data = {
      points: latLngsElevation.map((ll: L.LatLng) => [ll.lng, ll.lat]),
      style: {
        color: shape.properties.style?.color || '#FF4500',
        weight: shape.properties.style?.weight || 4,
        opacity: shape.properties.style?.opacity || 0.8,
        name: shape.properties.style?.name || ''
      },
      elevationData: shape.properties.elevationData,
      minElevation: shape.properties.minElevation,
      maxElevation: shape.properties.maxElevation,
      elevationGain: shape.properties.elevationGain,
      elevationLoss: shape.properties.elevationLoss,
      averageSlope: shape.properties.averageSlope,
      maxSlope: shape.properties.maxSlope
    } as ElevationLineData;
    return { type_forme: 'ElevationLine', data };
  }

  // Vérifier si c'est un polygone
  if (shape instanceof Polygon || shape.properties?.type === 'Polygon') {
    const latLngs = shape.getLatLngs()[0] as L.LatLng[];
    const data: PolygonData = {
      points: latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]),
      style: {
        color: shape.properties.style?.color || '#3388ff',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        fillColor: shape.properties.style?.fillColor || '#3388ff',
        fillOpacity: shape.properties.style?.fillOpacity || 0.2,
        name: shape.properties.style?.name || ''
      },
      area: shape.properties.area || 0
    };
    return { type_forme: 'Polygon', data };
  }

  // Vérifier si c'est une ligne
  if (shape instanceof Line || shape.properties?.type === 'Line') {
    const latLngs = shape.getLatLngs() as L.LatLng[];
    const data: LineData = {
      points: latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]),
      style: {
        color: shape.properties.style?.color || '#3388ff',
        weight: shape.properties.style?.weight || 3,
        opacity: shape.properties.style?.opacity || 1,
        name: shape.properties.style?.name || ''
      },
      length: shape.properties.length || 0
    };
    return { type_forme: 'Line', data };
  }

  throw new Error('Type de forme non reconnu');
}

function convertStoredElementToShape(element: DrawingElement): any {
  console.log('[DrawingStore] Conversion de l\'élément stocké en forme', { element });

  switch (element.type_forme) {
    case 'CircleWithSections': {
      const data = element.data as CircleWithSectionsData;
      if (!data.center || !data.radius) {
        console.error('[DrawingStore] Données invalides pour CircleWithSections');
        return null;
      }

      // Créer un CircleWithSections
      const circleWithSections = new CircleWithSections(
        L.latLng(data.center[1], data.center[0]),
        {
          color: data.style?.color || '#3388ff',
          weight: data.style?.weight || 3,
          opacity: data.style?.opacity || 1,
          fillColor: data.style?.fillColor || '#3388ff',
          fillOpacity: data.style?.fillOpacity || 0.2,
          dashArray: data.style?.dashArray || '',
          name: data.style?.name || '',
          radius: data.radius,
          sections: data.sections || []
        }
      );

      // S'assurer que le type est correctement défini
      circleWithSections.properties.type = 'CircleWithSections';

      console.log('[DrawingStore] CircleWithSections restauré:', {
        center: data.center,
        radius: data.radius,
        sections: data.sections?.length || 0
      });

      return circleWithSections;
    }

    case 'TextRectangle': {
      if (!isTextData(element.data)) {
        console.error('[DrawingStore] Données invalides pour TextRectangle');
        return null;
      }

      const textData = element.data;
      if (!textData.bounds) {
        console.error('[DrawingStore] Données de bounds manquantes pour TextRectangle');
        return null;
      }

      const bounds = new L.LatLngBounds(
        L.latLng(textData.bounds.southWest[1], textData.bounds.southWest[0]),
        L.latLng(textData.bounds.northEast[1], textData.bounds.northEast[0])
      );

      const options = {
        color: textData.style?.color || '#3388ff',
        fillColor: textData.style?.fillColor || '#3388ff',
        fillOpacity: textData.style?.fillOpacity || 0.2,
        weight: textData.style?.weight || 3,
        opacity: textData.style?.opacity || 1,
        name: textData.style?.name || '',
        textStyle: {
          color: textData.style.textStyle?.color || '#000000',
          fontSize: textData.style.textStyle?.fontSize || '14px',
          fontFamily: textData.style.textStyle?.fontFamily || 'Arial, sans-serif',
          textAlign: textData.style.textStyle?.textAlign || 'center',
          backgroundColor: textData.style.textStyle?.backgroundColor || '#FFFFFF',
          backgroundOpacity: textData.style.textStyle?.backgroundOpacity ?? 1,
          bold: textData.style.textStyle?.bold || false,
          italic: textData.style.textStyle?.italic || false
        }
      };

      const textRect = new TextRectangle(bounds, textData.content || 'Double-cliquez pour éditer', options);
      if (textData.rotation) {
        textRect.setRotation(textData.rotation);
      }
      
      // S'assurer que le nom est mis dans style.name
      if (textData.style?.name) {
        textRect.properties.style.name = textData.style.name;
      }
      
      return textRect;
    }

    case 'Polygon': {
      const data = element.data;
      if (!isPolygonData(data)) {
        console.error('[DrawingStore] Données invalides pour Polygon');
        return null;
      }

      const points = data.points.map((point: [number, number]) => 
        L.latLng(point[1], point[0])
      );

      const polygon = new Polygon([points], {
        color: data.style?.color || '#3388ff',
        weight: data.style?.weight || 3,
        opacity: data.style?.opacity || 1,
        fillColor: data.style?.fillColor || '#3388ff',
        fillOpacity: data.style?.fillOpacity || 0.2,
        dashArray: data.style?.dashArray || '',
        name: data.style?.name || ''
      });

      polygon.updateProperties();
      
      return polygon;
    }

    case 'ElevationLine': {
      const data = element.data;
      if (!isElevationData(data)) {
        console.error('[DrawingStore] Données invalides pour ElevationLine');
        return null;
      }

      const points = data.points.map((point: [number, number]) => 
        L.latLng(point[1], point[0])
      );

      const elevationLine = new ElevationLine(points, {
        color: data.style?.color || '#FF4500',
        weight: data.style?.weight || 4,
        opacity: data.style?.opacity || 0.8,
        name: data.style?.name || ''
      });

      // Restore all properties including elevation data
      elevationLine.properties = {
        type: 'ElevationLine',
        style: {
          ...(data.style || {}),
          name: data.style?.name || ''
        },
        elevationData: data.elevationData,
        minElevation: data.minElevation,
        maxElevation: data.maxElevation,
        elevationGain: data.elevationGain,
        elevationLoss: data.elevationLoss,
        averageSlope: data.averageSlope,
        maxSlope: data.maxSlope,
        dataSource: 'restored' // Mark as restored to prevent unnecessary API calls
      };

      // Update elevation profile if we have data
      if (data.elevationData) {
        elevationLine.updateElevationProfile();
      }

      console.log('[DrawingStore] ElevationLine restored:', {
        points: points.length,
        hasElevationData: !!data.elevationData,
        name: data.style?.name,
        properties: elevationLine.properties
      });

      return elevationLine;
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

      const line = new Line(points, {
        ...(data.style || {}),
        name: data.style?.name || ''
      });
      
      line.updateProperties();
      return line;
    }

    case 'Semicircle': {
      const data = element.data as SemicircleData;
      if (!data.center || !data.radius) {
        console.error('[DrawingStore] Données invalides pour Semicircle');
        return null;
      }

      const center = L.latLng(data.center[1], data.center[0]);
      const circleArc = new CircleArc(
        center,
        data.radius,
        data.startAngle || 0,
        data.endAngle || 180,
        {
          color: data.style?.color || '#3388ff',
          weight: data.style?.weight || 3,
          opacity: data.style?.opacity || 1,
          fillColor: data.style?.fillColor || '#3388ff',
          fillOpacity: data.style?.fillOpacity || 0.2,
          dashArray: data.style?.dashArray || '',
          name: data.style?.name || ''
        }
      );

      // Définir les propriétés
      circleArc.properties = {
        type: 'Semicircle',
        radius: data.radius,
        startAngle: data.startAngle || 0,
        stopAngle: data.endAngle || 180,
        style: {
          ...(data.style || {}),
          name: data.style?.name || ''
        },
        center: center
      };

      // Calculer les propriétés additionnelles
      const openingAngle = ((data.endAngle || 180) - (data.startAngle || 0) + 360) % 360;
      const surface = (Math.PI * Math.pow(data.radius, 2) * openingAngle) / 360;
      const arcLength = (2 * Math.PI * data.radius * openingAngle) / 360;
      const perimeter = arcLength + 2 * data.radius;

      // Ajouter les propriétés calculées
      circleArc.properties.surface = surface;
      circleArc.properties.arcLength = arcLength;
      circleArc.properties.perimeter = perimeter;
      circleArc.properties.openingAngle = openingAngle;
      circleArc.properties.diameter = data.radius * 2;

      console.log('[DrawingStore] Semicircle restauré:', {
        center: data.center,
        radius: data.radius,
        angles: {
          start: data.startAngle,
          end: data.endAngle
        },
        properties: circleArc.properties
      });

      return circleArc;
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
        color: data.style?.color || '#3388ff',
        weight: data.style?.weight || 3,
        opacity: data.style?.opacity || 1,
        fillColor: data.style?.fillColor || '#3388ff',
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
          color: data.style?.color || '#3388ff',
          weight: data.style?.weight || 3,
          opacity: data.style?.opacity || 1,
          fillColor: data.style?.fillColor || '#3388ff',
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
    getLastUsedType: (state) => state.lastUsedType
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
    async loadPlanElements(planId: number) {
      const endMeasure = this.performanceMonitor.startMeasure('loadPlanElements', 'DrawingStore');
      
      // Si le plan est déjà chargé avec des éléments, ne pas recharger
      if (this.currentMapId === planId && this.elements.length > 0) {
        console.log(`[DrawingStore] Plan ${planId} déjà chargé avec ${this.elements.length} éléments`);
        endMeasure();
        return this.elements;
      }

      this.loading = true;
      try {
        console.log('[DrawingStore] Début du chargement du plan', { planId });
        const response = await this.performanceMonitor.measureAsync(
          'loadPlanElements_apiCall',
          () => api.get(`/plans/${planId}/`),
          'DrawingStore'
        );
        const plan = response.data;
        console.log('[DrawingStore] Données du plan reçues', {
          formes: plan.formes,
          preferences: plan.preferences
        });
        
        // Analyse détaillée des formes reçues
        if (plan.formes && Array.isArray(plan.formes)) {
          plan.formes.forEach((forme: any, index: number) => {
            console.log(`[DrawingStore] Analyse détaillée forme ${index}:`, {
              id: forme.id,
              type_forme: forme.type_forme,
              hasData: !!forme.data,
              dataKeys: forme.data ? Object.keys(forme.data) : [],
              name: forme.data?.name,
              hasName: forme.data && 'name' in forme.data,
              centerType: forme.data?.center ? typeof forme.data.center : 'undefined',
              center: forme.data?.center
            });
          });
        }
        
        // Convertir les formes en éléments de dessin
        this.elements = plan.formes.map((forme: any) => {
          console.log('[DrawingStore] Traitement de la forme stockée', {
            id: forme.id,
            type_forme: forme.type_forme,
            data: forme.data,
            isTextRectangle: forme.type_forme === 'TEXTE' || (forme.data && isTextData(forme.data))
          });
          // Si la forme a déjà été convertie en élément de dessin
          if (forme.type_forme) {
            console.log('[DrawingStore] Forme déjà au format élément', {
              type_forme: forme.type_forme,
              data: forme.data,
              hasName: forme.data && 'name' in forme.data,
              name: forme.data?.name
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
              console.log('[DrawingStore] Forme convertie avec succès', {
                originalType: forme.type_forme,
                convertedType: convertedShape.type,
                properties: convertedShape.properties
              });
              return convertShapeToDrawingElement(convertedShape);
            }
          } catch (error) {
            console.error('[DrawingStore] Erreur lors de la conversion de la forme', {
              error,
              forme
            });
          }
          // En cas d'échec, retourner la forme telle quelle
          console.warn('[DrawingStore] Utilisation de la forme sans conversion', {
            type_forme: forme.type_forme,
            data: forme.data
          });
          return forme;
        });
        console.log(`[DrawingStore] Plan ${planId} - Chargé ${this.elements.length} éléments`, {
          elements: this.elements.map(el => ({
            id: el.id,
            type_forme: el.type_forme,
            isTextRectangle: el.type_forme === 'TextRectangle' || isTextData(el.data)
          }))
        });
        this.currentMapId = planId;
        this.unsavedChanges = false;
        // Charger les préférences du plan
        if (plan.preferences) {
          console.log('[DrawingStore] Chargement des préférences', plan.preferences);
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
        console.error('[DrawingStore] Erreur lors du chargement des éléments:', error);
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
        console.log('[DrawingStore][saveToPlan] Début de la sauvegarde', {
          targetPlanId,
          currentPlanId: this.currentMapId,
          elementsCount: this.elements.length,
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

        this.elements = this.performanceMonitor.measure(
          'saveToPlan_processResponse',
          () => response.data.formes.map((forme: any) => ({
            ...forme,
            type_forme: forme.type_forme
          })),
          'DrawingStore'
        );

        this.unsavedChanges = false;
        return response.data;
      } catch (error) {
        console.error('[DrawingStore][saveToPlan] ERREUR:', error);
        console.error('[DrawingStore][saveToPlan] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        this.error = 'Erreur lors de la sauvegarde du plan';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    }
  }
}); 