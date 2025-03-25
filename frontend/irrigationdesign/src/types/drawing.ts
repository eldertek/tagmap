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
export interface TextStyle {
  color: string;
  fontSize: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
  backgroundOpacity: number;
  bold: boolean;
  italic: boolean;
}
export interface TextRectangleStyle extends Style {
  textStyle: TextStyle;
  name?: string;
}
export interface Bounds {
  southWest: [number, number];
  northEast: [number, number];
}
export interface BaseData {
  style: Style;
  rotation?: number;
  name?: string;
}
export interface CircleData extends BaseData {
  center: [number, number];  // [longitude, latitude]
  radius: number;
}

// Interface pour une section de cercle
export interface CircleSection {
  id: string;
  startAngle: number;
  endAngle: number;
  radius: number;
  color: string;
  name?: string;
  surface?: number;
}

// Interface pour un cercle avec sections
export interface CircleWithSectionsData extends CircleData {
  sections: CircleSection[];
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
export interface SemicircleData extends BaseData {
  center: [number, number];  // [longitude, latitude]
  radius: number;
  startAngle: number;
  endAngle: number;
}
export interface LineData extends BaseData {
  points: [number, number][];  // Array of [longitude, latitude]
}
export interface TextData {
  bounds: Bounds;
  content: string;
  style: TextRectangleStyle;
  rotation?: number;
  name?: string;
}
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
  type: "unknown" | "Rectangle" | "Circle" | "Polygon" | "Line" | "Semicircle" | "CircleWithSections";
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
}

// Union type pour toutes les formes possibles
export type ShapeData = 
  | TextData 
  | PolygonData 
  | LineData 
  | RectangleData 
  | CircleData
  | ElevationLineData
  | CircleWithSectionsData
  | SemicircleData;

// Type pour les types de formes possibles
export type DrawingElementType = 
  | 'Circle'
  | 'Rectangle'
  | 'Semicircle'
  | 'Line'
  | 'TextRectangle'
  | 'Polygon'
  | 'ElevationLine'
  | 'CircleWithSections'
  | 'unknown';

// Interface principale pour un élément de dessin
export interface DrawingElement {
  id?: number;
  type_forme: DrawingElementType;
  data: ShapeData;
}

export interface TextRectangleProperties {
  type: 'TextRectangle';
  text: string;
  width: number;
  height: number;
  area: number;
  rotation: number;
  center?: L.LatLng;
  name?: string;
  style: TextRectangleStyle;
} 