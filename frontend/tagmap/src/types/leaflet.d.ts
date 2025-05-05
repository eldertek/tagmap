import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
declare module 'leaflet' {
  interface Layer {
    properties?: any;
    pm?: any;
    _map?: L.Map | undefined;
    _textLayer?: L.Marker;
    _dbId?: number | string;
    _originalStyle?: any;
    options: L.LayerOptions;
    getCenter?: () => L.LatLng;
    getLatLng?: () => L.LatLng;
    getRadius?: () => number;
    getStartAngle?: () => number;
    getStopAngle?: () => number;
    name?: string;
    updateProperties?: () => void;
    editNote?: () => void;
    recreateIcon?: () => void;
    getElement?: () => HTMLElement | null | Element | undefined;
    getLengthToVertex?: (vertex: number) => number;
  }
  interface Map {
    pm: PMMap;
    dragging: any;
    getZoom(): number;
    almostOver: {
      addLayer: (layer: L.Layer) => void;
      removeLayer: (layer: L.Layer) => void;
      options: {
        tolerance: number;
      };
    };
  }
  
  // Étendre MapOptions plutôt que de redéfinir options sur Map
  interface MapOptions {
    almostOnMouseMove?: boolean;
    zoomAnimation?: boolean;
    fadeAnimation?: boolean;
    markerZoomAnimation?: boolean;
  }
  
  // Étendre la définition des événements Leaflet pour les événements AlmostOver
  namespace LeafletEvent {
    interface AlmostOverEvent extends L.LeafletEvent {
      latlng: L.LatLng;
      layer: L.Layer;
    }
  }
  
  interface DivIcon {
    options: {
      html: string;
      className: string;
      iconSize: [number | null, number | null];
    }
  }
  interface MarkerOptions {
    icon: L.DivIcon;
    draggable?: boolean;
    pmIgnore?: boolean;
  }
}
export interface TextStyle {
  fontSize: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: string;
  borderOpacity: number;
  padding: string;
  borderRadius: string;
  hasBorder: boolean;
  rotation: number;
  physicalSize: number;  // Taille physique en mètres
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  letterSpacing?: string;
  lineHeight?: string;
  maxWidth?: string;
  minWidth?: string;
  wordWrap?: string;
  overflow?: string;
  textShadow?: string;
}
export interface TextProperties {
  type: 'text';
  text: string;
  style: TextStyle;
  physicalWidth: number;
  physicalHeight: number;
  _textLayer?: L.Marker;
}