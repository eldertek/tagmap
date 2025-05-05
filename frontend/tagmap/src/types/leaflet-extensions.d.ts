import * as L from 'leaflet';

// Extend Leaflet's type definitions with our custom methods
declare module 'leaflet' {
  interface Polyline {
    updateProperties?: () => void;
    getLengthToVertex?: (vertexIndex: number) => number;
    properties?: any;
    getMidPoints?: () => L.LatLng[];
    getMidPointAt?: (segmentIndex: number) => L.LatLng | null;
    moveVertex?: (vertexIndex: number, newLatLng: L.LatLng, updateProps?: boolean) => void;
    getCenter?: () => L.LatLng;
    getSegmentLengths?: () => number[];
    getSegmentLengthAt?: (segmentIndex: number) => number;
    getLength?: () => number;
    setName?: (name: string) => void;
    getName?: () => string;
  }

  interface Marker {
    recreateIcon?: () => void;
    editNote?: () => void;
    updateProperties?: () => void;
  }

  interface Polygon {
    updateProperties?: () => void;
  }

  interface Layer {
    setName?: (name: string) => void;
    getName?: () => string;
    id?: string | number;
    bringToFront?: () => void;
    createPopupContent?: () => string;
    _leaflet_id?: number;
    setNoteStyle?: (style: any) => void;
  }
}