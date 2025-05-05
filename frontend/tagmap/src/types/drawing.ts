import type L from 'leaflet';
import type { Ref } from 'vue';

// Interface pour les événements AlmostOver de Leaflet
export interface AlmostOverEvent extends L.LeafletEvent {
  latlng: L.LatLng;
  layer: L.Layer;
}

// Extend GlobalOptions to include snapLayers
export interface ExtendedGlobalOptions extends L.PM.GlobalOptions {
  snapLayers?: L.LayerGroup[];
}

// Interface pour les points de contrôle avec mesure
export interface ControlPoint extends L.CircleMarker {
  measureDiv?: HTMLElement;
}

// Types pour les références
export type MapRef = Ref<L.Map | null>;
export type FeatureGroupRef = Ref<L.FeatureGroup | null>;
export type LayerRef = Ref<L.Layer | null>;

// Interface pour le retour de useMapDrawing
export interface MapDrawingReturn {
  map: MapRef;
  featureGroup: FeatureGroupRef;
  controlPointsGroup: FeatureGroupRef;
  tempControlPointsGroup: FeatureGroupRef;
  currentTool: Ref<string>;
  selectedShape: LayerRef;
  isDrawing: Ref<boolean>;
  initMap: (element: HTMLElement, center: L.LatLngExpression, zoom: number) => L.Map;
  setDrawingTool: (tool: string) => void;
  updateShapeStyle: (style: Record<string, unknown>) => void;
  updateShapeProperties: (properties: Record<string, unknown>) => void;
  adjustView: () => void;
  clearActiveControlPoints: () => void;
  addLinesToAlmostOver: () => void;
}

// Interface for drawable layers
export interface DrawableLayer extends L.Layer {
  getBounds(): L.LatLngBounds;
  getLatLng?(): L.LatLng;
  getRadius?(): number;
  properties?: any;
  startResize?(): void;
  updateResizePreview?(bounds: L.LatLngBounds): void;
  endResize?(bounds: L.LatLngBounds): void;
}

export interface Style {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  opacity?: number;
  fontSize?: string;
  dashArray?: string;
  name?: string;
  radius?: number;
}

export interface Bounds {
  southWest: [number, number];
  northEast: [number, number];
}

// Type pour les niveaux d'accès
export type AccessLevel = 'company' | 'employee' | 'visitor';

// Type pour les catégories d'éléments
export type ElementCategory = 'forages' | 'clients' | 'entrepots' | 'livraisons' | 'cultures' | 'parcelles' | string;

export interface BaseData {
  style: Style;
  rotation?: number;
  name?: string;
  category?: ElementCategory;
  accessLevel?: AccessLevel;
}

export interface LineData extends BaseData {
  points: [number, number][];  // Array of [longitude, latitude]
}

export interface PolygonData extends BaseData {
  points: [number, number][];  // Array of [longitude, latitude]
}

export interface ShapeType {
  type: string; // Accepte n'importe quelle chaîne de caractères pour le type
  properties: {
    type?: string;
    style?: any;
    dimensions?: {
      width?: number;
      height?: number;
      radius?: number;
      orientation?: number;
    };
    area?: number;
    perimeter?: number;
    length?: number;
    rotation?: number;
    [key: string]: any;
  };
  layer: any;
  options?: any;
}

// Interface pour les données de notes géolocalisées
export interface NoteData extends BaseData {
  location: [number, number] | {
    type: string;
    coordinates: [number, number]; // [longitude, latitude] pour GeoJSON
  };
  description?: string;
  columnId?: string;
  comments?: Array<{
    id: number;
    text: string;
    createdAt: string;
    userId: number;
    userName: string;
    userRole: string;
  }>;
  photos?: Array<{
    id: number;
    url: string;
    createdAt: string;
    caption?: string;
  }>;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Union type pour toutes les formes possibles
export type ShapeData =
  | PolygonData
  | LineData
  | NoteData;

// Type pour les types de formes possibles
export type DrawingElementType =
  | 'Line'
  | 'Polygon'
  | 'Note'
  | 'unknown';

// Interface principale pour un élément de dessin
export interface DrawingElement {
  id?: number;
  type_forme: DrawingElementType;
  data: ShapeData;
}

