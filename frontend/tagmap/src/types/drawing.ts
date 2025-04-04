import type L from 'leaflet';
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
}
// TextStyle and TextRectangleStyle interfaces removed as per requirements
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
export interface CircleData extends BaseData {
  center: [number, number];  // [longitude, latitude]
  radius: number;
}

export interface RectangleData {
  bounds: {
    southWest: [number, number];
    northEast: [number, number];
  };
  style: any;
  rotation?: number;
  width?: number;
  height?: number;
  center?: [number, number];
  name?: string;
}
// SemicircleData interface removed as per requirements
export interface LineData extends BaseData {
  points: [number, number][];  // Array of [longitude, latitude]
}
// TextData interface removed as per requirements
export interface PolygonData extends BaseData {
  points: [number, number][];  // Array of [longitude, latitude]
}
export interface ElevationLineData extends BaseData {
  points: [number, number][];
  elevationData?: Array<{ distance: number; elevation: number }>;
  samplePointStyle?: Style;
  minMaxPointStyle?: Style;
  minElevation?: number;
  maxElevation?: number;
  elevationGain?: number;
  elevationLoss?: number;
  averageSlope?: number;
  maxSlope?: number;
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

// Union type pour toutes les formes possibles
export type ShapeData =
  | PolygonData
  | LineData
  | RectangleData
  | CircleData
  | ElevationLineData;

// Type pour les types de formes possibles
export type DrawingElementType =
  | 'Circle'
  | 'Rectangle'
  | 'Line'
  | 'Polygon'
  | 'ElevationLine'
  | 'Note'
  | 'unknown';

// Interface principale pour un élément de dessin
export interface DrawingElement {
  id?: number;
  type_forme: DrawingElementType;
  data: ShapeData;
}

// TextRectangleProperties interface removed as per requirements