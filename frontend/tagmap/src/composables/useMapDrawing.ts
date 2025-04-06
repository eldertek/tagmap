import { ref, onUnmounted, nextTick, type Ref } from 'vue';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Circle } from '../utils/Circle';
import { Rectangle } from '../utils/Rectangle';
import { Line } from '../utils/Line';
import { Polygon } from '../utils/Polygon';
import { ElevationLine } from '../utils/ElevationLine';
import { GeoNote } from '../utils/GeoNote';
import type { TextMarker, TextStyle } from '../types/leaflet';
import type { DrawableLayer } from '../types/drawing';
import type { Feature, FeatureCollection, GeoJsonProperties, Polygon as GeoJSONPolygon } from 'geojson';
import { polygon, lineString } from '@turf/helpers';
import area from '@turf/area';
import length from '@turf/length';
import intersect from '@turf/intersect';
import centroid from '@turf/centroid';
import circle from '@turf/circle';
import { featureCollection } from '@turf/helpers';
import { useDrawingStore } from '../stores/drawing';
// import { performanceMonitor } from '@/utils/usePerformanceMonitor'; // Supprimé car non utilisé

// Interfaces supprimées car non utilisées
// interface FrozenState {
//   draggable?: boolean;
//   pmEnabled?: boolean;
// }
//
// interface ExtendedLayer extends L.Layer {
//   pm?: any;
//   options: L.LayerOptions & Partial<L.PathOptions>;
//   setStyle?: (style: L.PathOptions) => void;
// }

// Ajouter cette interface avant la déclaration du module 'leaflet'
interface CustomIconOptions extends L.DivIconOptions {
  html?: string;
  className?: string;
}
// Extend GlobalOptions to include snapLayers
interface ExtendedGlobalOptions extends L.PM.GlobalOptions {
  snapLayers?: L.LayerGroup[];
}
// Modifier l'interface Layer pour éviter les conflits de type
declare module 'leaflet' {
  interface Layer {
    properties?: any;
    pm?: any;
    _textLayer?: L.Marker;
    options: L.LayerOptions;
    getCenter?: () => L.LatLng;
    getLatLng?: () => L.LatLng;
    getRadius?: () => number;
    getStartAngle?: () => number;
    getStopAngle?: () => number;
  }
}
// Utilitaire pour convertir une couleur hex en rgba
const hexToRgba = (hex: string | undefined, opacity: number): string => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(0, 0, 0, ${opacity})`; // Couleur par défaut
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
// Fonction pour mettre à jour le style d'un élément de texte
const updateTextStyle = (element: HTMLElement, style: TextStyle) => {
  element.style.fontSize = style.fontSize;
  element.style.color = style.color;
  element.style.backgroundColor = hexToRgba(style.backgroundColor, style.backgroundOpacity);
  if (style.hasBorder) {
    element.style.border = `${style.borderWidth} solid ${hexToRgba(style.borderColor, style.borderOpacity)}`;
  } else {
    element.style.border = 'none';
  }
  element.style.padding = style.padding;
  element.style.borderRadius = style.borderRadius;
};
// Fonction pour créer et afficher un message d'aide
const showHelpMessage = (message: string): HTMLElement => {
  // Supprimer tous les messages d'aide existants
  const existingMessages = document.querySelectorAll('.drawing-help-message');
  existingMessages.forEach(msg => msg.remove());
  const helpMsg = L.DomUtil.create('div', 'drawing-help-message');
  helpMsg.innerHTML = message;
  helpMsg.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 2000;
    pointer-events: none;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  `;
  document.body.appendChild(helpMsg);
  return helpMsg;
};
// Fonction pour convertir les mètres en pixels selon la latitude et le zoom
function metersToPixels(meters: number, latitude: number, zoom: number): number {
  const resolution = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
  return meters / resolution;
}
// Fonction pour formater les mesures
const formatMeasure = (value: number, unit: string = 'm', label: string = ''): string => {
  let formattedValue: string;
  let formattedUnit: string;
  // Formater selon l'unité
  if (unit === 'm²') {
    if (value >= 10000) {
      formattedValue = (value / 10000).toFixed(2);
      formattedUnit = 'ha';
    } else {
      formattedValue = value.toFixed(2);
      formattedUnit = 'm²';
    }
  } else if (unit === 'm') {
    if (value >= 1000) {
      formattedValue = (value / 1000).toFixed(2);
      formattedUnit = 'km';
    } else {
      formattedValue = value.toFixed(2);
      formattedUnit = 'm';
    }
  } else {
    formattedValue = value.toFixed(2);
    formattedUnit = unit;
  }
  return label ? `${label}: ${formattedValue} ${formattedUnit}` : `${formattedValue} ${formattedUnit}`;
};
// Interface pour les points de contrôle avec mesure
interface ControlPoint extends L.CircleMarker {
  measureDiv?: HTMLElement;
}
// Ajouter cette fonction utilitaire en haut du fichier
const convertMouseEvent = (e: MouseEvent): MouseEvent => {
  return {
    ...e,
    clientX: e.clientX,
    clientY: e.clientY,
    button: e.button || 0,
    buttons: e.buttons || 0,
    altKey: e.altKey || false,
  } as MouseEvent;
};
interface MapDrawingReturn {
  map: Ref<any>;
  featureGroup: Ref<any>;
  controlPointsGroup: Ref<any>;
  tempControlPointsGroup: Ref<any>;
  currentTool: Ref<string>;
  selectedShape: Ref<any>;
  isDrawing: Ref<boolean>;
  initMap: (element: HTMLElement, center: L.LatLngExpression, zoom: number) => L.Map;
  setDrawingTool: (tool: string) => void;
  updateShapeStyle: (style: any) => void;
  updateShapeProperties: (properties: any) => void;
  updateTextFixedSize: (textMarker: TextMarker, physicalSizeInMeters: number) => void;
  adjustView: () => void;
  clearActiveControlPoints: () => void;
  calculateTotalCoverageArea: (layers: L.Layer[]) => number;
  showCoverageOverlay: (layers: L.Layer[], targetLayer?: L.Layer) => void;  // Nouvelle fonction
  hideCoverageOverlay: () => void;                   // Nouvelle fonction
  calculateConnectedCoverageArea: (layers: L.Layer[], startLayer: L.Layer) => number;
  getConnectedShapes: (layers: L.Layer[], startLayer: L.Layer) => L.Layer[];
}
// Ajouter cette fonction en haut du fichier, après les imports
const debounce = (fn: Function, delay: number) => {
  let timeoutId: number;
  return function (this: any, ...args: any[]) {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
  };
};
// Ajouter cette fonction throttle pour limiter la fréquence des mises à jour
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = Date.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    return fn.apply(this, args);
  };
};
// Ajouter cette fonction en haut du fichier
export function useMapDrawing(): MapDrawingReturn {
  const map = ref<any>(null);
  const featureGroup = ref<any>(null);
  const controlPointsGroup = ref<any>(null);
  const tempControlPointsGroup = ref<any>(null);
  const currentTool = ref<string>('');
  const selectedShape = ref<any>(null);
  const isDrawing = ref<boolean>(false);
  // Ajouter une référence pour la couche de visualisation
  const coverageOverlayGroup = ref<L.LayerGroup | null>(null);

  // Supprimé car non utilisé
  // const frozenStates = new WeakMap<L.Layer, FrozenState>();

  // Ajouter l'écouteur d'événement pour le nettoyage
  window.addEventListener('clearControlPoints', () => {
    // Désélectionner la forme active
    selectedShape.value = null;
    // Nettoyer les points de contrôle
    if (controlPointsGroup.value) {
      controlPointsGroup.value.clearLayers();
    }
    if (tempControlPointsGroup.value) {
      tempControlPointsGroup.value.clearLayers();
    }
    // Supprimer tous les tooltips de mesure
    document.querySelectorAll('.measure-tooltip').forEach(el => el.remove());
    // Supprimer tous les messages d'aide
    document.querySelectorAll('.drawing-help-message').forEach(el => el.remove());
  });
  // Nettoyer l'écouteur lors du démontage
  onUnmounted(() => {
    window.removeEventListener('clearControlPoints', () => { });
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  });
  const createTextMarker = (latlng: L.LatLng, text: string = 'Double-cliquez pour éditer'): L.Marker => {
    const defaultStyle: TextStyle = {
      fontSize: '14px',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 1,
      borderColor: '#000000',
      borderWidth: '1px',
      borderOpacity: 1,
      padding: '5px 10px',
      borderRadius: '3px',
      hasBorder: true,
      rotation: 0,
      physicalSize: 2.0
    };
    const createHtml = (text: string, style: TextStyle) => {
      const zoom = map.value?.getZoom() || 14;
      const centerLat = latlng.lat;
      const boxSizePx = metersToPixels(style.physicalSize, centerLat, zoom);
      return `<div class="text-container" style="width:${boxSizePx}px;height:${boxSizePx}px;transform:rotate(${style.rotation}deg)">
        <div class="text-annotation" style="font-size:${boxSizePx * 0.2}px;color:${style.color};background-color:${hexToRgba(style.backgroundColor, style.backgroundOpacity)};border:${style.hasBorder ? style.borderWidth + ' solid ' + hexToRgba(style.borderColor, style.borderOpacity) : 'none'};padding:${style.padding};border-radius:${style.borderRadius}">${text}</div>
        <div class="text-controls"><div class="control-button rotate"></div><div class="control-button move"></div></div>
      </div>`;
    };
    const updateMarkerSize = () => {
      if (!map.value) return;
      // Mettre à jour l'icône avec la nouvelle taille
      const icon = marker.getIcon();
      const newOptions: CustomIconOptions = {
        html: createHtml(marker.properties.text, marker.properties.style),
        className: icon.options.className
      };
      marker.setIcon(L.divIcon(newOptions));
    };
    const textIcon = L.divIcon({
      html: createHtml(text, defaultStyle),
      className: 'text-container',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    const marker = L.marker(latlng, {
      icon: textIcon,
      draggable: false,
      pmIgnore: true
    });
    marker.properties = {
      type: 'text',
      text: text,
      style: { ...defaultStyle }
    };
    // Gestion du zoom
    if (map.value) {
      map.value.on('zoomend', updateMarkerSize);
      marker.on('remove', () => {
        map.value?.off('zoomend', updateMarkerSize);
      });
    }
    // Appliquer la taille initiale
    updateMarkerSize();
    // Gestion des contrôles
    let isRotating = false;
    let isDragging = false;
    let startAngle = 0;
    let startRotation = 0;
    const onMouseDown = (e: MouseEvent) => {
      if (!map.value) return;
      const target = e.target as HTMLElement;
      if (target.classList.contains('rotate')) {
        isRotating = true;
        const markerPos = marker.getLatLng();
        const mousePos = map.value.mouseEventToLatLng(e as any);
        startAngle = Math.atan2(
          mousePos.lat - markerPos.lat,
          mousePos.lng - markerPos.lng
        ) * 180 / Math.PI;
        startRotation = marker.properties.style.rotation || 0;
      } else if (target.classList.contains('move')) {
        isDragging = true;
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !map.value) return;
      if (isRotating) {
        const markerPos = marker.getLatLng();
        const mousePos = map.value.mouseEventToLatLng(e as any);
        const currentAngle = Math.atan2(
          mousePos.lat - markerPos.lat,
          mousePos.lng - markerPos.lng
        ) * 180 / Math.PI;
        const rotation = (startRotation + (currentAngle - startAngle)) % 360;
        marker.properties.style.rotation = rotation;
        const icon = marker.getIcon() as L.DivIcon;
        const newOptions: CustomIconOptions = {
          html: createHtml(marker.properties.text, marker.properties.style),
          className: icon.options.className
        };
        marker.setIcon(L.divIcon(newOptions));
      } else if (isDragging) {
        const mouseEvent = convertMouseEvent(e);
        const newPos = map.value.mouseEventToLatLng(mouseEvent);
        marker.setLatLng(newPos);
      }
    };
    const onMouseUp = () => {
      isRotating = false;
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    marker.on('add', () => {
      const element = marker.getElement();
      if (element) {
        const controls = element.querySelectorAll('.control-button');
        controls.forEach((control: Element) => {
          control.addEventListener('mousedown', onMouseDown as EventListener);
        });
      }
    });
    marker.on('remove', () => {
      const element = marker.getElement();
      if (element) {
        const controls = element.querySelectorAll('.control-button');
        controls.forEach((control: Element) => {
          control.removeEventListener('mousedown', onMouseDown as EventListener);
        });
      }
    });
    // Édition du texte
    marker.on('dblclick', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const element = marker.getElement()?.querySelector('.text-annotation') as HTMLElement;
      if (!element) return;
      element.contentEditable = 'true';
      element.focus();
      element.classList.add('editing');
      // Sélectionner tout le texte
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
      const finishEditing = () => {
        element.contentEditable = 'false';
        element.classList.remove('editing');
        const newText = element.innerText.trim();
        if (newText) {
          marker.properties.text = newText;
          const icon = marker.getIcon() as L.DivIcon;
          const newOptions: CustomIconOptions = {
            html: createHtml(newText, marker.properties.style),
            className: icon.options.className
          };
          marker.setIcon(L.divIcon(newOptions));
        }
        element.removeEventListener('blur', finishEditing);
        element.removeEventListener('keydown', onKeyDown);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finishEditing();
        }
      };
      element.addEventListener('blur', finishEditing);
      element.addEventListener('keydown', onKeyDown);
    });
    return marker;
  };
  // Ajouter cette fonction après la fonction showMeasure
  const showMeasure = (position: L.LatLng, text: string): HTMLElement => {
    const measureDiv = L.DomUtil.create('div', 'measure-tooltip');
    measureDiv.innerHTML = text;
    measureDiv.style.cssText = `
      position: fixed;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 2000;
      pointer-events: none;
      white-space: pre-line;
    `;
    document.body.appendChild(measureDiv);
    // Positionner la tooltip
    if (map.value) {
      const point = map.value.latLngToContainerPoint(position);
      measureDiv.style.left = `${point.x + 10}px`;
      measureDiv.style.top = `${point.y - 25}px`;
    }
    return measureDiv;
  };
  // Version throttlée pour la mise à jour des mesures
  const throttledUpdateMeasure = throttle((measureDiv: HTMLElement, position: L.LatLng, text: string) => {
    if (!measureDiv) return;
    // Mettre à jour le contenu
    measureDiv.innerHTML = text;
    // Mettre à jour la position
    if (map.value) {
      const point = map.value.latLngToContainerPoint(position);
      measureDiv.style.left = `${point.x + 10}px`;
      measureDiv.style.top = `${point.y - 25}px`;
    }
  }, 100); // Limiter à une mise à jour tous les 100ms
  // Fonction pour ajouter les événements de mesure aux points de contrôle
  const addMeasureEvents = (point: ControlPoint, _layer: L.Layer, getMeasureText: () => string) => {
    point.on('mouseover', () => {
      const measureDiv = showMeasure(point.getLatLng(), getMeasureText());
      point.measureDiv = measureDiv;
    });
    point.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (point.measureDiv && map.value) {
        // Utiliser la version throttlée pour limiter les mises à jour
        throttledUpdateMeasure(point.measureDiv, e.latlng, getMeasureText());
      }
    });
    point.on('mouseout', () => {
      if (point.measureDiv) {
        point.measureDiv.remove();
        point.measureDiv = undefined;
      }
    });
  };
  // Ajouter ces variables au niveau du composable
  let activeControlPoints: ControlPoint[] = [];
  // Fonction pour nettoyer les points de contrôle actifs
  const clearActiveControlPoints = () => {
    // Appeler la fonction de nettoyage si elle existe
    if ((activeControlPoints as any).cleanup) {
      (activeControlPoints as any).cleanup();
    }

    // Remplacer la boucle de suppression par un clearLayers complet
    if (controlPointsGroup.value) {
      controlPointsGroup.value.clearLayers();
    }
    activeControlPoints = [];

    // Nettoyer aussi les points temporaires et les mesures
    tempControlPointsGroup.value?.clearLayers();
    document.querySelectorAll('.measure-tooltip').forEach(el => el.remove());

    // Nettoyer les points d'aide des rectangles
    if (featureGroup.value) {
      featureGroup.value.getLayers().forEach((layer: L.Layer) => {
        if (layer instanceof Rectangle) {
          layer.clearHelperPoints();
        }
      });
    }
  };
  // Fonction pour créer un point de contrôle
  const createControlPoint = (position: L.LatLng, color: string = '#2563EB'): L.CircleMarker => {
    const point = L.circleMarker(position, {
      radius: 6,
      color: color,
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
      className: 'control-point',
      pmIgnore: true
    } as L.CircleMarkerOptions);
    if (controlPointsGroup.value) {
      controlPointsGroup.value.addLayer(point);
    }
    return point;
  };
  // Fonction pour calculer les propriétés d'une forme
  const calculateShapeProperties = (layer: L.Layer, type: string): any => {
    console.log('Input layer:', {
      type,
      instanceof: {
        Circle: layer instanceof L.Circle,
        Rectangle: layer instanceof L.Rectangle,
        Polygon: layer instanceof L.Polygon,
        Polyline: layer instanceof L.Polyline,
        ElevationLine: layer instanceof ElevationLine,
        Line: layer instanceof Line
      },
      options: layer.options
    });
    const properties: any = {
      type,
      style: layer.options || {}
    };
    try {
      // Gestion des types de formes existants
      if (layer instanceof L.Circle) {
        // Propriétés pour les cercles
        const radius = (layer as any).getRadius();
        properties.radius = radius;
        properties.diameter = radius * 2;
        properties.surface = Math.PI * Math.pow(radius, 2);
        properties.perimeter = 2 * Math.PI * radius;
        properties.center = (layer as any).getLatLng();
      } else if (layer instanceof L.Rectangle) {
        // Propriétés pour les rectangles
        const bounds = (layer as L.Rectangle).getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const widthLine = lineString([[sw.lng, sw.lat], [ne.lng, sw.lat]]);
        const heightLine = lineString([[sw.lng, sw.lat], [sw.lng, ne.lat]]);
        const width = length(widthLine, { units: 'meters' });
        const height = length(heightLine, { units: 'meters' });
        properties.width = width;
        properties.height = height;
        properties.surface = width * height;
        properties.perimeter = 2 * (width + height);
        properties.dimensions = { width, height };
      } else if (layer instanceof L.Polygon) {
        // Propriétés pour les polygones
        try {
          const latLngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
          const coordinates = latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
          coordinates.push(coordinates[0]); // Fermer le polygone
          const polygonFeature = polygon([coordinates]);
          properties.surface = area(polygonFeature);
          properties.perimeter = length(lineString(coordinates), { units: 'meters' });
        } catch (e) {
          console.error('Erreur lors du calcul des propriétés du polygone', e);
        }
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // Propriétés pour les lignes
        try {
          const latLngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
          let length = 0;
          for (let i = 1; i < latLngs.length; i++) {
            length += latLngs[i].distanceTo(latLngs[i - 1]);
          }
          properties.length = length;
        } catch (e) {
          console.error('Erreur lors du calcul de la longueur de la ligne', e);
        }
      }
      // Ajouter les propriétés de style
      properties.style = {
        ...properties.style,
        color: (layer.options as L.PathOptions)?.color || '#3388ff',
        weight: (layer.options as L.PathOptions)?.weight || 3,
        opacity: (layer.options as L.PathOptions)?.opacity || 1,
        fillColor: (layer.options as L.PathOptions)?.fillColor || '#3388ff',
        fillOpacity: (layer.options as L.PathOptions)?.fillOpacity || 0.2,
        dashArray: (layer.options as any)?.dashArray || ''
      };
    } catch (error) {
      console.error('Error calculating shape properties:', error);
    }
    return properties;
  };
  // Fonction pour mettre à jour la taille physique du texte
  const updateTextFixedSize = (textMarker: TextMarker, physicalSizeInMeters: number = 2.0) => {
    if (!map.value) {
      console.warn('Map is not available for text size update');
      return;
    }
    const zoom = map.value.getZoom();
    const centerLat = textMarker.getLatLng().lat;
    const fontSizePx = metersToPixels(physicalSizeInMeters, centerLat, zoom);
    const element = textMarker.getElement()?.querySelector('.text-annotation') as HTMLElement;
    if (element) {
      textMarker.properties.style.fontSize = `${fontSizePx}px`;
      textMarker.properties.physicalWidth = physicalSizeInMeters;
      textMarker.properties.physicalHeight = physicalSizeInMeters;
      updateTextStyle(element, textMarker.properties.style);
    }
  };
  const initMap = (element: HTMLElement, center: L.LatLngExpression, zoom: number): L.Map => {
    const mapInstance = L.map(element).setView(center, zoom);
    map.value = mapInstance;
    L.tileLayer(import.meta.env.VITE_OSM_TILES_URL, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      noWrap: true,
      keepBuffer: 5,
    }).addTo(mapInstance);
    const fg = new L.FeatureGroup();
    fg.addTo(mapInstance);
    featureGroup.value = fg;
    // Initialiser les groupes de points de contrôle
    controlPointsGroup.value = L.featureGroup().addTo(mapInstance);
    tempControlPointsGroup.value = L.featureGroup().addTo(mapInstance);
    // Configuration de Leaflet-Geoman
    mapInstance.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
      preventMarkerRemoval: true,
      syncLayersOnDrag: true,
      layerGroup: fg,
      snapLayers: [fg, tempControlPointsGroup.value],
      templineStyle: {
        color: '#3388ff',
        weight: 2,
        opacity: 0.7,
        dashArray: '6,6',
        radius: 6
      } as L.CircleMarkerOptions,
      hintlineStyle: {
        color: '#3388ff',
        weight: 2,
        opacity: 0.7,
        dashArray: '6,6',
        radius: 6
      } as L.CircleMarkerOptions
    } as ExtendedGlobalOptions);
    // Événements de dessin
    mapInstance.on('pm:drawstart', (e: any) => {
      isDrawing.value = true;
      // Définir le curseur approprié
      if (e.shape === 'Circle' && currentTool.value === 'Semicircle') {
        mapInstance.getContainer().style.cursor = 'crosshair';
      }
    });
    mapInstance.on('pm:drawend', () => {
      isDrawing.value = false;
      // Réinitialiser le curseur
      mapInstance.getContainer().style.cursor = '';
      // Afficher le message d'aide uniquement si une forme a été créée
      if (selectedShape.value) {
        showHelpMessage('Cliquez sur la forme pour afficher les points de contrôle');
      }
    });

    // Utiliser le gestionnaire d'événements par défaut pour pm:create
    mapInstance.on('pm:create', defaultCreateHandler);

    // Événements de sélection uniquement sur featureGroup (formes)
    fg.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const clickedLayer = e.layer;

      // S'assurer que le nom est toujours dans l'objet properties
      // qui est conservé lors du proxying
      if (clickedLayer.name && !clickedLayer.properties?.name) {
        if (!clickedLayer.properties) clickedLayer.properties = {};
        clickedLayer.properties.name = clickedLayer.name;
      }
      else if (clickedLayer.properties?.name && !clickedLayer.name) {
        clickedLayer.name = clickedLayer.properties.name;
      }

      // Définir explicitement pour le débogage
      console.log('[featureGroup click] État du nom:', {
        directName: clickedLayer.name,
        propertiesName: clickedLayer.properties?.name,
        fullProperties: clickedLayer.properties
      });

      // Reste du code...
      tempControlPointsGroup.value?.clearLayers();
      clearActiveControlPoints();
      selectedShape.value = clickedLayer;

      if (clickedLayer instanceof Circle) {
        updateCircleControlPoints(clickedLayer);
      } else if (clickedLayer instanceof L.Circle) {
        // Pour la compatibilité avec les cercles standard de Leaflet
        // Convertir en notre cercle personnalisé
        console.log('[useMapDrawing] Création du cercle personnalisé:', {
          propertyDescriptor: Object.getOwnPropertyDescriptor(clickedLayer, 'name'),
          directName: (clickedLayer as any).name,
          propertiesName: (clickedLayer as any).properties?.name,
          styleNameBeforeTransfer: (clickedLayer as any).properties?.style?.name,
          nameIsEnumerable: Object.keys(clickedLayer).includes('name'),
          allProperties: Object.keys((clickedLayer as any).properties || {}),
          _dbId: (clickedLayer as any)._dbId
        });

        // Sauvegarder les propriétés importantes avant conversion
        const layerName = (clickedLayer as any).name;
        const propertiesName = (clickedLayer as any).properties?.name;
        const stylePropertyName = (clickedLayer as any).properties?.style?.name;
        const dbId = (clickedLayer as any)._dbId;

        const circle = new Circle(clickedLayer.getLatLng(), {
          ...clickedLayer.options,
          radius: clickedLayer.getRadius()
        });

        // Restaurer toutes les propriétés du layer d'origine
        if ((clickedLayer as any).properties) {
          circle.properties = { ...((clickedLayer as any).properties || {}) };
        } else {
          circle.updateProperties();
        }

        // S'assurer explicitement que le nom est conservé dans tous les emplacements
        const preservedName = layerName || propertiesName || stylePropertyName;
        if (preservedName) {
          circle.properties.name = preservedName;
          if (!circle.properties.style) {
            circle.properties.style = {};
          }
          circle.properties.style.name = preservedName;
          (circle as any).name = preservedName;
        }

        // Restaurer l'ID de base de données
        if (dbId) {
          (circle as any)._dbId = dbId;
        }

        // Log final pour vérifier l'état
        console.log('[useMapDrawing] Cercle après conversion:', {
          name: (circle as any).name,
          propertiesName: circle.properties.name,
          stylePropertyName: circle.properties.style?.name,
          allProperties: Object.keys(circle.properties || {})
        });

        featureGroup.value?.removeLayer(clickedLayer);
        featureGroup.value?.addLayer(circle);
        selectedShape.value = circle;
        updateCircleControlPoints(circle);
      } else if (clickedLayer instanceof Rectangle) {
        updateRectangleControlPoints(clickedLayer);
      } else if (clickedLayer instanceof L.Rectangle) {
        // Pour la compatibilité avec les rectangles standard de Leaflet
        // Convertir en notre rectangle personnalisé
        const rectangle = new Rectangle(clickedLayer.getBounds(), {
          ...clickedLayer.options
        });
        rectangle.updateProperties();
        featureGroup.value?.removeLayer(clickedLayer);
        featureGroup.value?.addLayer(rectangle);
        selectedShape.value = rectangle;
        updateRectangleControlPoints(rectangle);
      } else if (clickedLayer instanceof L.Polygon) {
        updatePolygonControlPoints(clickedLayer);
      } else if (clickedLayer instanceof Line) {
        // Si c'est notre Line personnalisée, traiter spécifiquement
        updateLineControlPoints(clickedLayer);
      } else if (clickedLayer instanceof L.Polyline) {
        updateLineControlPoints(clickedLayer);
      } else if (clickedLayer instanceof GeoNote) {
        // Si c'est une note géolocalisée, traiter spécifiquement
        updateGeoNoteControlPoints(clickedLayer);
      }
    });
    // Événements d'édition
    mapInstance.on('pm:edit', (e: any) => {
      console.log('[pm:edit] Début', {
        layer: e.layer,
        currentProperties: e.layer.properties
      });
      const layer = e.layer;
      if (layer) {
        const shapeType = layer.properties?.type || 'unknown';
        updateLayerProperties(layer, shapeType);
        console.log('[pm:edit] Après updateLayerProperties', {
          updatedProperties: layer.properties,
          selectedShape: selectedShape.value
        });
        // Mise à jour des points de contrôle
        if (layer instanceof Circle) {
          updateCircleControlPoints(layer);
        } else if (layer instanceof Rectangle) {
          updateRectangleControlPoints(layer);
        } else if (layer instanceof L.Rectangle) {
          // Si c'est un rectangle standard Leaflet, le convertir en notre Rectangle personnalisé
          const rectangle = new Rectangle(layer.getBounds(), {
            ...layer.options
          });
          rectangle.updateProperties();
          featureGroup.value?.removeLayer(layer);
          featureGroup.value?.addLayer(rectangle);
          selectedShape.value = rectangle;
          updateRectangleControlPoints(rectangle);
        } else if (layer instanceof L.Polygon) {
          updatePolygonControlPoints(layer);
        } else if (layer instanceof Line) {
          // Si c'est notre Line personnalisée, s'assurer de mettre à jour ses propriétés
          layer.updateProperties();
          updateLayerProperties(layer, 'Line');
          // Mettre à jour les points de contrôle
          updateLineControlPoints(layer);
        } else if (layer instanceof L.Polyline) {
          updateLineControlPoints(layer);
        } else if (layer instanceof GeoNote) {
          // Si c'est une note géolocalisée, mettre à jour ses propriétés
          layer.updateProperties();
          // Mettre à jour les points de contrôle
          updateGeoNoteControlPoints(layer);
        }
      }
    });
    // Événements de glisser-déposer
    mapInstance.on('pm:dragstart', () => {
      // Supprimer les messages précédents avant d'afficher le nouveau
      document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
      showHelpMessage('Déplacez la forme à l\'endroit souhaité');
    });
    mapInstance.on('pm:dragend', (e: any) => {
      console.log('[pm:dragend] Début', {
        layer: e.layer,
        currentProperties: e.layer.properties
      });
      const layer = e.layer;
      if (layer) {
        const shapeType = layer.properties?.type || 'unknown';
        // Si c'est un Rectangle standard Leaflet, le convertir en notre Rectangle personnalisé
        if (layer instanceof L.Rectangle && !(layer instanceof Rectangle)) {
          const rectangle = new Rectangle(layer.getBounds(), {
            ...layer.options
          });
          rectangle.updateProperties();
          featureGroup.value?.removeLayer(layer);
          featureGroup.value?.addLayer(rectangle);
          selectedShape.value = rectangle;
          updateRectangleControlPoints(rectangle);
        } else if (layer instanceof Line) {
          // Si c'est notre Line personnalisée, s'assurer de mettre à jour ses propriétés
          layer.updateProperties();
          updateLayerProperties(layer, 'Line');
          // Mettre à jour les points de contrôle
          updateLineControlPoints(layer);
        } else {
          updateLayerProperties(layer, shapeType);
        }
        console.log('[pm:dragend] Après updateLayerProperties', {
          updatedProperties: layer.properties,
          selectedShape: selectedShape.value
        });
      }
      setTimeout(() => {
        showHelpMessage('Cliquez sur la forme pour afficher les points de contrôle');
      }, 100);
    });
    // Événements de suppression
    mapInstance.on('pm:remove', () => {
      document.querySelector('.drawing-help-message')?.remove();
    });
    // Événements de sélection/désélection
    mapInstance.on('pm:select', () => {
      // Supprimer les messages précédents avant d'afficher le nouveau
      document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
      // Message d'aide générique pour toutes les formes
      showHelpMessage('Utilisez les points de contrôle pour modifier la forme');
    });
    mapInstance.on('pm:unselect', () => {
      // Supprimer tous les messages d'aide à la désélection
      document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
    });
    // Désélectionner la forme et ses points de contrôle lors du zoom/dézoom
    mapInstance.on('zoomstart', () => {
      if (selectedShape.value) {
        clearActiveControlPoints();
        selectedShape.value = null;
        document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
      }
    });
    return mapInstance;
  };
  const adjustView = () => {
    if (!map.value || !featureGroup.value || !featureGroup.value.getLayers().length) {
      return;
    }

    try {
      const bounds = featureGroup.value.getBounds();
      if (bounds.isValid()) {
        // Désactiver temporairement les animations
        const originalAnimationState = {
          zoomAnimation: map.value.options.zoomAnimation,
          fadeAnimation: map.value.options.fadeAnimation,
          markerZoomAnimation: map.value.options.markerZoomAnimation
        };

        // Désactiver les animations pendant l'ajustement
        map.value.options.zoomAnimation = false;
        map.value.options.fadeAnimation = false;
        map.value.options.markerZoomAnimation = false;

        // Ajuster la vue sans animation
        map.value.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 18,
          animate: false,
          duration: 0,
          noMoveStart: true
        });

        // Forcer un rafraîchissement immédiat
        map.value.invalidateSize({ animate: false, pan: false });

        // Restaurer les animations progressivement
        setTimeout(() => {
          try {
            // Restaurer uniquement fadeAnimation d'abord
            map.value.options.fadeAnimation = originalAnimationState.fadeAnimation;

            // Puis après un délai supplémentaire, restaurer les autres animations
            setTimeout(() => {
              try {
                map.value.options.zoomAnimation = originalAnimationState.zoomAnimation;
                map.value.options.markerZoomAnimation = originalAnimationState.markerZoomAnimation;
              } catch (e) {
                console.warn('[useMapDrawing] Erreur lors de la restauration des animations:', e);
              }
            }, 500);
          } catch (e) {
            console.warn('[useMapDrawing] Erreur lors de la restauration des animations:', e);
          }
        }, 500);

      }
    } catch (error) {
      console.warn('[useMapDrawing] Error adjusting view:', error);
      // En cas d'erreur, essayer de restaurer un état stable
      if (map.value) {
        try {
          map.value.options.zoomAnimation = true;
          map.value.options.fadeAnimation = true;
          map.value.options.markerZoomAnimation = true;
          map.value.invalidateSize({ animate: false, pan: false });
        } catch (e) {
          console.error('[useMapDrawing] Erreur lors de la restauration après échec:', e);
        }
      }
    }
  };
  const setDrawingTool = (tool: string) => {
    if (!map.value) return;
    // Nettoyer les messages d'aide existants
    document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
    // Désactiver tous les modes et nettoyer les points de contrôle
    try {
      const pm = map.value.pm;
      if (pm.globalEditModeEnabled()) {
        pm.disableGlobalEditMode();
      }
      if (pm.globalRemovalModeEnabled()) {
        pm.disableGlobalRemovalMode();
      }
      pm.disableDraw();
      clearActiveControlPoints();
      tempControlPointsGroup.value?.clearLayers();
    } catch (error) {
      console.error('Error disabling modes:', error);
    }
    currentTool.value = tool;
    // Si aucun outil n'est sélectionné
    if (!tool) {
      clearActiveControlPoints();
      return;
    }

    // Convertir les noms d'outils du composant DrawingTools aux noms d'outils internes
    let internalTool = tool;

    // Mapper les noms d'outils du composant DrawingTools aux noms d'outils internes
    switch (tool) {
      case 'Note':
        internalTool = 'GeoNote'; // Utiliser notre nouvel outil GeoNote pour les notes géolocalisées
        break;
      case 'Polygon':
        internalTool = 'Polygon';
        break;
      case 'Line':
        internalTool = 'Line';
        break;
      case 'ElevationLine':
        internalTool = 'ElevationLine';
        break;
      default:
        internalTool = tool;
    }

    // Utiliser le nom d'outil interne pour le reste de la fonction
    tool = internalTool;

    // Restaurer le gestionnaire par défaut pour tous les outils
    restoreDefaultCreateHandler();

    setTimeout(() => {
      try {
        switch (tool) {
          case 'Polygon':
            showHelpMessage('Cliquez pour ajouter des points, double-cliquez pour terminer le polygone');
            map.value?.pm.enableDraw('Polygon', {
              finishOn: 'dblclick',
              continueDrawing: false,
              snapMiddle: true,
              snapDistance: 20
            });

            // Supprimer l'ancien gestionnaire d'événements s'il existe
            map.value?.off('pm:create');
            // Ajouter le nouveau gestionnaire
            map.value?.on('pm:create', (e: any) => {
              if (e.shape === 'Polygon' && e.layer) {
                const latLngs = e.layer.getLatLngs()[0];
                // Supprimer le polygone temporaire
                map.value?.removeLayer(e.layer);
                if (featureGroup.value?.hasLayer(e.layer)) {
                  featureGroup.value.removeLayer(e.layer);
                }

                // Créer un nouveau polygone avec notre classe personnalisée
                const polygon = new Polygon(latLngs, {
                  color: '#3B82F6',
                  weight: 3,
                  fillColor: '#3B82F6',
                  fillOpacity: 0.2
                });

                // Ajouter le polygone au groupe de fonctionnalités
                if (featureGroup.value) {
                  featureGroup.value.addLayer(polygon);
                  selectedShape.value = polygon;

                  // Forcer la mise à jour des propriétés
                  polygon.updateProperties();
                }

                // Désactiver le mode dessin
                map.value?.pm.disableDraw();
                // Restaurer le gestionnaire par défaut
                restoreDefaultCreateHandler();
              }
            });
            break;
          case 'Circle':
            // Préparer les points de repère (centres potentiels)
            if (featureGroup.value) {
              // Trouver les rectangles pour utiliser leurs centres et sommets
              const rectangles = featureGroup.value.getLayers().filter((layer: L.Layer) => {
                return layer instanceof Rectangle;
              }) as Rectangle[];

              // Ajouter les points de repère en utilisant la nouvelle méthode pour tous les rectangles
              rectangles.forEach(rect => {
                rect.toggleHelperPoints(map.value, true, '#DC2626', '#2563EB');
              });
            }

            // Configurer le snapping
            map.value.pm.setGlobalOptions({
              snapDistance: 15,
              snapSegment: true,
              snapVertices: true,
              snapLayers: [featureGroup.value, tempControlPointsGroup.value],
              snapMiddle: true,
              snapIntersections: true
            } as any);

            // Message d'aide
            let helpMessage = 'Positionnez le centre du cercle. Points bleus : milieu des côtés, Points rouges : sommets, Point vert : centre';
            showHelpMessage(helpMessage);

            // Activer le dessin du cercle
            map.value.pm.enableDraw('Circle', {
              finishOn: 'mouseup',
              continueDrawing: false
            });
            break;
          case 'Rectangle':
            showHelpMessage('Cliquez et maintenez pour dessiner un rectangle, relâchez pour terminer');
            map.value?.pm.enableDraw('Rectangle', {
              finishOn: 'mouseup' as any
            });
            break;
          case 'Polygon':
            showHelpMessage('Cliquez pour ajouter des points, double-cliquez pour terminer le polygone');
            map.value?.pm.enableDraw('Polygon', {
              finishOn: 'dblclick',
              continueDrawing: false,
              snapMiddle: true,
              snapDistance: 20
            });
            break;
          case 'Line':
            showHelpMessage('Cliquez pour ajouter des points, double-cliquez pour terminer la ligne');
            map.value?.pm.enableDraw('Line', {
              finishOn: 'dblclick',
              continueDrawing: false,
              snapMiddle: true,
              snapDistance: 20
            });

            // Supprimer l'ancien gestionnaire d'événements s'il existe
            map.value?.off('pm:create');
            // Ajouter le nouveau gestionnaire
            map.value?.on('pm:create', (e: any) => {
              if (e.shape === 'Line' && e.layer) {
                const latLngs = e.layer.getLatLngs();
                // Supprimer la ligne temporaire
                map.value?.removeLayer(e.layer);
                if (featureGroup.value?.hasLayer(e.layer)) {
                  featureGroup.value.removeLayer(e.layer);
                }

                // Créer une nouvelle ligne avec notre classe personnalisée
                const line = new Line(latLngs, {
                  color: '#3B82F6',
                  weight: 3,
                  opacity: 0.8
                });

                // Ajouter la ligne au groupe de fonctionnalités
                if (featureGroup.value) {
                  featureGroup.value.addLayer(line);
                  selectedShape.value = line;

                  // Forcer la mise à jour des propriétés
                  line.updateProperties();
                }

                // Désactiver le mode dessin
                map.value?.pm.disableDraw();
                // Restaurer le gestionnaire par défaut
                restoreDefaultCreateHandler();
              }
            });
            break;
          case 'Text':
            showHelpMessage('Cliquez pour ajouter du texte, double-cliquez pour éditer');
            if (map.value) {
              const onClick = (e: L.LeafletMouseEvent) => {
                if (!map.value || !featureGroup.value) return;
                const marker = createTextMarker(e.latlng);
                featureGroup.value.addLayer(marker);
                selectedShape.value = marker;
                // Désactiver le mode texte après l'ajout
                map.value.off('click', onClick);
                setDrawingTool('');
              };
              map.value.on('click', onClick);
            }
            break;
          case 'GeoNote':
            showHelpMessage('Cliquez pour ajouter une note géolocalisée, double-cliquez pour éditer');
            if (map.value) {
              const onClick = async (e: L.LeafletMouseEvent) => {
                if (!map.value || !featureGroup.value) return;

                try {
                  // Initialiser le store de dessin
                  const drawingStore = useDrawingStore();

                  // Créer une nouvelle note géolocalisée
                  const geoNote = new GeoNote(e.latlng, {
                    color: '#3B82F6',
                    name: 'Note géolocalisée',
                    description: '',
                    columnId: '1' // Associer automatiquement à la colonne 'Idées'
                  });
                  featureGroup.value.addLayer(geoNote);
                  selectedShape.value = geoNote;

                  // Mettre à jour les propriétés
                  geoNote.updateProperties();

                  // Préparer les données pour l'API
                  // Format GeoDjango PointField: { "type": "Point", "coordinates": [longitude, latitude] }
                  const noteData = {
                    plan: drawingStore.currentMapId, // Utiliser l'ID du plan courant
                    title: geoNote.properties.name,
                    description: geoNote.properties.description,
                    // Convertir en format GeoJSON Point pour GeoDjango
                    location: {
                      type: 'Point',
                      coordinates: [e.latlng.lng, e.latlng.lat] // IMPORTANT: ordre lng, lat (x, y) pour GeoJSON
                    },
                    access_level: geoNote.properties.accessLevel,
                    style: geoNote.properties.style,
                    category: geoNote.properties.category
                  };

                  console.log('[useMapDrawing] Sauvegarde de la note géolocalisée dans le backend:', noteData);

                  // Sauvegarder la note dans le backend
                  import('../services/api').then(async ({ noteService }) => {
                    try {
                      const response = await noteService.createNote(noteData);
                      console.log('[useMapDrawing] Note sauvegardée avec succès:', response.data);

                      // Stocker l'ID renvoyé par le backend (important!)
                      const backendId = response.data.id;

                      // IMPORTANT: Conserver l'ID Leaflet original pour référence
                      const leafletId = (geoNote as any)._leaflet_id;
                      console.log(`[useMapDrawing] ID Leaflet: ${leafletId}, ID backend: ${backendId}`);

                      // Mettre à jour l'ID de la note avec celui renvoyé par le backend
                      (geoNote as any)._dbId = backendId;

                      // CRUCIAL: Mettre à jour la propriété id pour qu'elle utilise l'ID du backend
                      geoNote.properties.id = backendId;

                      // Mettre à jour la columnId avec celle renvoyée par le backend
                      if (response.data.column_id) {
                        geoNote.properties.columnId = response.data.column_id;
                        console.log('[useMapDrawing] colonne mise à jour avec:', response.data.column_id);
                      }

                      // Émettre un événement pour informer de la création réussie
                      window.dispatchEvent(new CustomEvent('note:created', {
                        detail: {
                          note: response.data,
                          geoNote,
                          leafletId,
                          backendId
                        }
                      }));

                      // Ouvrir le popup pour édition immédiate
                      geoNote.openPopup();

                      // Déclencher la sauvegarde automatique du plan
                      geoNote.triggerPlanSave();
                    } catch (error) {
                      console.error('[useMapDrawing] Erreur lors de la sauvegarde de la note:', error);
                      // Afficher un message d'erreur ou annuler l'opération
                      import('../stores/notification').then(({ useNotificationStore }) => {
                        const notificationStore = useNotificationStore();
                        notificationStore.error('Erreur lors de la création de la note');
                      });
                    }
                  });

                  // Désactiver le mode note après l'ajout
                  map.value.off('click', onClick);
                  setDrawingTool('');
                } catch (error) {
                  console.error('[useMapDrawing] Erreur lors de la création de la note:', error);
                  // Désactiver le mode note en cas d'erreur
                  map.value.off('click', onClick);
                  setDrawingTool('');
                }
              };
              map.value.on('click', onClick);
            }
            break;
          case 'delete':
            showHelpMessage('Cliquez sur une forme pour la supprimer');
            map.value?.pm.enableGlobalRemovalMode();
            break;
          // TextRectangle case removed as per requirements
          case 'ElevationLine':
            showHelpMessage('Cliquez et maintenez pour tracer le profil altimétrique');
            map.value?.pm.enableDraw('Line', {
              finishOn: 'mouseup',
              continueDrawing: false, // Désactiver la continuation
              allowSelfIntersection: false,
              templineStyle: {
                color: '#FF4500',
                weight: 4,
                opacity: 0.8
              }
            });

            // Désactiver explicitement la continuation après le dessin
            map.value?.pm.setGlobalOptions({
              continueDrawing: false,
              finishOn: 'mouseup',
              preventMarkerRemoval: true,
              preventVertexEdit: true,
              preventMarkerEdit: true
            } as any);

            // Supprimer l'ancien gestionnaire d'événements s'il existe
            map.value?.off('pm:create');
            // Ajouter le nouveau gestionnaire
            map.value?.on('pm:create', async (e: any) => {
              if (e.shape === 'Line' && e.layer) {
                const latLngs = e.layer.getLatLngs();
                // Supprimer la ligne temporaire
                map.value?.removeLayer(e.layer);
                if (featureGroup.value?.hasLayer(e.layer)) {
                  featureGroup.value.removeLayer(e.layer);
                }

                // Créer une nouvelle ligne d'élévation
                const elevationLine = new ElevationLine(latLngs, {
                  color: '#FF4500',
                  weight: 4,
                  opacity: 0.8,
                  interactive: false,
                  pmIgnore: true
                });

                // Ajouter la ligne au groupe de fonctionnalités
                if (featureGroup.value) {
                  featureGroup.value.addLayer(elevationLine);
                  selectedShape.value = elevationLine;

                  // Initialiser le profil d'élévation et attendre la fin
                  await elevationLine.updateElevationProfile();

                  // Forcer la mise à jour des propriétés
                  const updatedProperties = calculateShapeProperties(elevationLine, 'ElevationLine');

                  // Fusionner avec les propriétés spécifiques d'élévation
                  Object.assign(elevationLine.properties, {
                    ...updatedProperties,
                    ...elevationLine.properties,
                    type: 'ElevationLine',
                    elevationData: elevationLine.getElevationData()
                  });

                  // Forcer la mise à jour du composant
                  selectedShape.value = null;
                  nextTick(() => {
                    selectedShape.value = elevationLine;
                  });
                }

                // Désactiver le mode dessin et réinitialiser l'outil
                map.value?.pm.disableDraw();
                currentTool.value = '';

                // Restaurer le gestionnaire par défaut
                restoreDefaultCreateHandler();
              }
            });
            break;
        }
      } catch (error) {
        console.error('[setDrawingTool] Erreur lors de la configuration de l\'outil:', error);
      }
    }, 100);
  };
  const updateShapeStyle = (style: any) => {
    if (!selectedShape.value) return;
    const layer = selectedShape.value;
    layer.properties = layer.properties || {};
    layer.properties.style = layer.properties.style || {};
    layer.properties.style = { ...layer.properties.style, ...style };
    if (layer.properties.type === 'text') {
      const textLayer = layer.properties._textLayer;
      const element = textLayer?.getElement()?.querySelector('.text-annotation') as HTMLElement;
      if (element) {
        updateTextStyle(element, layer.properties.style);
      }
      const leafletStyle: L.PathOptions = {
        color: style.borderColor || layer.properties.style.borderColor,
        weight: parseInt(style.borderWidth || layer.properties.style.borderWidth),
        opacity: style.borderOpacity ?? layer.properties.style.borderOpacity
      };
      if ('setStyle' in layer) {
        (layer as L.Path).setStyle(leafletStyle);
      }
    } else if (layer.properties.type === 'TextRectangle') {
      // TextRectangle supprimé selon les exigences
      console.log('[updateShapeStyle] TextRectangle supprimé selon les exigences');
    } else {
      const leafletStyle: L.PathOptions = {};
      if (style.fillColor) leafletStyle.fillColor = style.fillColor;
      if (style.fillOpacity !== undefined) leafletStyle.fillOpacity = style.fillOpacity;
      if (style.strokeColor) leafletStyle.color = style.strokeColor;
      if (style.strokeOpacity !== undefined) leafletStyle.opacity = style.strokeOpacity;
      if (style.strokeWidth !== undefined) leafletStyle.weight = style.strokeWidth;
      if (style.dashArray) leafletStyle.dashArray = style.dashArray;
      if ('setStyle' in layer) {
        (layer as L.Path).setStyle(leafletStyle);
      }
    }
  };
  const updateShapeProperties = (properties: any) => {
    if (!selectedShape.value) {
      console.warn('[useMapDrawing] Cannot update properties: no shape selected');
      return;
    }

    console.log('[useMapDrawing] Updating shape properties', {
      before: selectedShape.value.properties,
      newProps: properties,
      layerType: selectedShape.value.properties?.type,
      beforeName: selectedShape.value.name,
      beforePropertiesName: selectedShape.value.properties?.name,
      beforeCategory: selectedShape.value.properties?.category,
      nameIsDirectProperty: 'name' in selectedShape.value,
      dbId: selectedShape.value._dbId
    });

    // Mettre à jour les propriétés de la forme
    if (!selectedShape.value.properties) {
      selectedShape.value.properties = {};
    }

    // S'assurer que le type est préservé
    const currentType = selectedShape.value.properties.type;
    console.log(`[useMapDrawing] Type actuel de la forme: ${currentType}`);

    // S'assurer que la catégorie est définie comme 'forages' par défaut
    if (!selectedShape.value.properties.category) {
      selectedShape.value.properties.category = 'forages';
    }

    // S'assurer que le niveau d'accès est défini comme 'visitor' par défaut
    if (!selectedShape.value.properties.accessLevel) {
      selectedShape.value.properties.accessLevel = 'visitor';
    }

    // Assurer que _dbId existe pour le filtrage
    if (!selectedShape.value._dbId) {
      selectedShape.value._dbId = Date.now() + Math.floor(Math.random() * 1000);
      console.log(`[useMapDrawing] Assigned temporary dbId: ${selectedShape.value._dbId}`);
    }

    // Sauvegarder le type actuel avant de mettre à jour les propriétés
    const originalType = selectedShape.value.properties.type;
    console.log(`[useMapDrawing] Type original avant mise à jour: ${originalType}`);

    // Sauvegarder la catégorie existante avant la mise à jour
    const existingCategory = selectedShape.value.properties.category;
    console.log(`[useMapDrawing] Catégorie existante: ${existingCategory}`);

    // Vérifier si la catégorie est mise à jour
    const isCategoryUpdated = 'category' in properties && properties.category !== existingCategory;

    // Appliquer les nouvelles propriétés
    Object.keys(properties).forEach(key => {
      // Ne pas écraser le type si la forme en a déjà un
      if (key === 'type' && originalType) {
        console.log(`[useMapDrawing] Préservation du type original: ${originalType}`);
        // Ne rien faire, on garde le type original
      } else {
        selectedShape.value.properties[key] = properties[key];
      }

      // Si on met à jour le nom, le stocker directement sur la couche aussi pour double sécurité
      if (key === 'name') {
        console.log(`[useMapDrawing] Setting name "${properties[key]}" directly on layer`);
        (selectedShape.value as any).name = properties[key];
      }

      // Si on met à jour la catégorie, la logger pour débogage
      if (key === 'category') {
        console.log(`[useMapDrawing] Mise à jour de la catégorie: ${existingCategory} -> ${properties[key]}`);
      }
    });

    // S'assurer que le type est toujours préservé après la mise à jour
    if (originalType) {
      selectedShape.value.properties.type = originalType;
    }

    // S'assurer que la catégorie est préservée si elle n'a pas été explicitement mise à jour
    if (existingCategory && !isCategoryUpdated) {
      console.log(`[useMapDrawing] Restauration de la catégorie originale: ${existingCategory}`);
      selectedShape.value.properties.category = existingCategory;
    }

    // Si la forme a un ID de base de données et que la catégorie a été mise à jour,
    // mettre à jour la catégorie dans le store
    if (selectedShape.value._dbId && isCategoryUpdated) {
      const drawingStore = useDrawingStore();
      const storeElement = drawingStore.elements.find((e: any) => e.id === selectedShape.value._dbId);

      if (storeElement) {
        console.log(`[useMapDrawing] Mise à jour de la catégorie dans le store: ${selectedShape.value.properties.category} pour l'élément ${selectedShape.value._dbId}`);

        // Utiliser une assertion de type pour éviter les erreurs TypeScript
        const anyElement = storeElement as any;
        if (!anyElement.data) {
          anyElement.data = {};
        }

        // Mettre à jour la catégorie dans le store
        anyElement.data.category = selectedShape.value.properties.category;

        // Marquer les changements comme non sauvegardés
        drawingStore.$patch({ unsavedChanges: true });
      }
    }

    // Émettre un événement pour indiquer que les propriétés ont été mises à jour
    // Cela permettra à d'autres composants de réagir aux changements
    const shapeEvent = new CustomEvent('shape:propertiesUpdated', {
      detail: {
        shape: selectedShape.value,
        properties: selectedShape.value.properties,
        categoryUpdated: isCategoryUpdated
      }
    });
    window.dispatchEvent(shapeEvent);

    console.log('[useMapDrawing] Updated shape properties', {
      after: selectedShape.value.properties,
      name: selectedShape.value.name,
      propertiesName: selectedShape.value.properties?.name,
      allLayerKeys: Object.keys(selectedShape.value),
      allPropertiesKeys: Object.keys(selectedShape.value.properties || {})
    });

    // Pour les cercles, mettre à jour des propriétés spécifiques
    if (selectedShape.value.properties?.type === 'Circle') {
      const circle = selectedShape.value as Circle;
      const radius = circle.getRadius();
      circle.properties.radius = radius;
      circle.properties.diameter = radius * 2;
      circle.properties.surface = Math.PI * radius * radius;
      circle.properties.perimeter = 2 * Math.PI * radius;

      // Assurons-nous que le nom est bien défini sur le cercle
      if (properties.name) {
        console.log(`[useMapDrawing] Ensuring circle name "${properties.name}" is set in multiple places`);
        circle.properties.name = properties.name;
        circle.properties.style.name = properties.name; // Ajout crucial
        (circle as any).name = properties.name;

        // Débogage supplémentaire
        console.log('[useMapDrawing] Circle name verification:', {
          circleDirectName: (circle as any).name,
          circlePropertiesName: circle.properties.name,
          nameIsEnumerable: Object.keys(circle).includes('name'),
          propertiesNameIsEnumerable: Object.keys(circle.properties).includes('name')
        });
      }
    }

    // L'événement est déjà émis plus haut dans la fonction
  };
  const forceShapeUpdate = (layer: L.Layer) => {
    console.log('[forceShapeUpdate] Début', {
      currentProperties: layer.properties,
      selectedShapeRef: selectedShape.value
    });
    // Réassigner directement selectedShape avec une nouvelle référence
    selectedShape.value = null; // Forcer un reset
    nextTick(() => {
      selectedShape.value = layer;
      console.log('[forceShapeUpdate] Après mise à jour', {
        selectedShape: selectedShape.value,
        properties: selectedShape.value.properties
      });
    });
  };
  const updateLayerProperties = (layer: L.Layer, shapeType: string) => {
    console.log('[updateLayerProperties] Début', {
      layer,
      shapeType,
      currentProperties: layer.properties
    });
    // Utiliser debouncedCalculateProperties au lieu de calculateShapeProperties directement
    const debouncedCalculateProperties = debounce((layer: L.Layer, shapeType: string) => {
      const newProperties = calculateShapeProperties(layer, shapeType);
      console.log('[updateLayerProperties] Nouvelles propriétés calculées', {
        newProperties
      });
      // Créer une nouvelle référence pour les propriétés
      layer.properties = { ...newProperties };
      // Forcer la mise à jour de la forme sélectionnée
      forceShapeUpdate(layer);
      // Émettre l'événement avec les nouvelles propriétés
      layer.fire('properties:updated', {
        shape: layer,
        properties: layer.properties
      });
      console.log('[updateLayerProperties] Fin', {
        finalProperties: layer.properties,
        selectedShape: selectedShape.value
      });
    }, 100); // Délai de 100ms
    debouncedCalculateProperties(layer, shapeType);
  };
  // Fonction pour calculer le point milieu entre deux points
  const getMidPoint = (p1: L.LatLng, p2: L.LatLng): L.LatLng => {
    return L.latLng(
      (p1.lat + p2.lat) / 2,
      (p1.lng + p2.lng) / 2
    );
  };
  // Fonction pour mettre à jour les points de contrôle d'un cercle
  const updateCircleControlPoints = (layer: Circle) => {
    if (!map.value || !featureGroup.value) return;
    clearActiveControlPoints();
    const center = layer.getLatLng();
    const radius = layer.getRadius();


    // Point central (vert)
    const centerPoint = createControlPoint(center, '#059669') as ControlPoint;
    activeControlPoints.push(centerPoint);
    // Ajouter les mesures au point central
    addMeasureEvents(centerPoint, layer, () => {
      return [
        formatMeasure(radius, 'm', 'Rayon'),
        formatMeasure(radius * 2, 'm', 'Diamètre'),
        formatMeasure(Math.PI * Math.pow(radius, 2), 'm²', 'Surface')
      ].join('<br>');
    });
    // Points cardinaux (bleu)
    const cardinalPoints: ControlPoint[] = [];
    const cardinalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    cardinalAngles.forEach((angle) => {
      const point = layer.calculatePointOnCircle(angle);
      const controlPoint = createControlPoint(point, '#2563EB') as ControlPoint;
      cardinalPoints.push(controlPoint);
      activeControlPoints.push(controlPoint);
      // Ajouter les mesures aux points cardinaux
      addMeasureEvents(controlPoint, layer, () => {
        return formatMeasure(radius, 'm', 'Rayon');
      });
      // Gestion du redimensionnement via les points cardinaux
      controlPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
        if (!map.value) return;
        L.DomEvent.stopPropagation(e);
        map.value.dragging.disable();
        let isDragging = true;

        const onMouseMove = (e: L.LeafletMouseEvent) => {
          if (!isDragging) return;
          // Utiliser la méthode pour redimensionner le cercle sans mise à jour des propriétés
          layer.resizeFromControlPoint(e.latlng);
          // Mettre à jour les positions de tous les points de contrôle
          cardinalPoints.forEach((point, i) => {
            const newPoint = layer.calculatePointOnCircle(cardinalAngles[i]);
            point.setLatLng(newPoint);
          });
          // Mettre à jour le point central
          centerPoint.setLatLng(layer.getLatLng());
          // Mettre à jour la mesure affichée si elle existe
          if (controlPoint.measureDiv) {
            controlPoint.measureDiv.innerHTML = formatMeasure(layer.getRadius(), 'm', 'Rayon');
          }
        };
        const onMouseUp = () => {
          isDragging = false;
          if (!map.value) return;
          map.value.off('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          map.value.dragging.enable();
          // Mettre à jour les propriétés UNIQUEMENT à la fin du redimensionnement
          layer.updateProperties();

          // Mise à jour de selectedShape pour déclencher la réactivité
          selectedShape.value = null; // Forcer un reset
          nextTick(() => {
            selectedShape.value = layer;
          });
          // Mettre à jour les propriétés via la méthode globale aussi
          updateLayerProperties(layer, 'Circle');
        };
        map.value.on('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
    // Gestion du déplacement via le point central
    centerPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!map.value) return;
      L.DomEvent.stopPropagation(e);
      map.value.dragging.disable();
      let isDragging = true;
      const startLatLng = layer.getLatLng();
      const startMouseLatLng = e.latlng;

      const onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!isDragging) return;
        // Calculer le déplacement
        const dx = e.latlng.lng - startMouseLatLng.lng;
        const dy = e.latlng.lat - startMouseLatLng.lat;
        // Déplacer le cercle sans mise à jour des propriétés
        const newLatLng = L.latLng(
          startLatLng.lat + dy,
          startLatLng.lng + dx
        );
        // Utiliser directement setLatLng du prototype de L.Circle pour éviter notre surcharge
        L.Circle.prototype.setLatLng.call(layer, newLatLng);
        centerPoint.setLatLng(newLatLng);
        // Mettre à jour les positions des points cardinaux
        cardinalPoints.forEach((point, i) => {
          const newPoint = layer.calculatePointOnCircle(cardinalAngles[i]);
          point.setLatLng(newPoint);
        });
        // Mettre à jour la mesure affichée si elle existe
        if (centerPoint.measureDiv) {
          centerPoint.measureDiv.innerHTML = [
            formatMeasure(layer.getRadius(), 'm', 'Rayon'),
            formatMeasure(layer.getRadius() * 2, 'm', 'Diamètre'),
            formatMeasure(Math.PI * Math.pow(layer.getRadius(), 2), 'm²', 'Surface')
          ].join('<br>');
        }
      };
      const onMouseUp = () => {
        isDragging = false;
        if (!map.value) return;
        map.value.off('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        map.value.dragging.enable();
        // Mettre à jour les propriétés UNIQUEMENT à la fin du déplacement
        layer.updateProperties();

        // Mise à jour de selectedShape pour déclencher la réactivité
        selectedShape.value = null; // Forcer un reset
        nextTick(() => {
          selectedShape.value = layer;
        });
        // Mettre à jour les propriétés via la méthode globale
        updateLayerProperties(layer, 'Circle');
      };
      map.value.on('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    // Écouter l'événement circle:resized pour mettre à jour les propriétés
    layer.on('circle:resized', () => {
      updateLayerProperties(layer, 'Circle');
    });
    // Synchroniser selectedShape au démarrage de la fonction
    selectedShape.value = layer;
  };
  // Fonction pour mettre à jour les points de contrôle d'un rectangle
  const updateRectangleControlPoints = (layer: any) => {
    if (!map.value || !featureGroup.value) return;

    // Vérifier que la couche est bien une instance de notre classe Rectangle
    if (!(layer instanceof Rectangle)) {
      console.warn('La couche n\'est pas une instance de Rectangle');
      return;
    }

    // Cast de la couche vers notre type Rectangle pour accéder aux méthodes spécifiques
    const rectangleLayer = layer as Rectangle;
    clearActiveControlPoints();

    // Récupérer les points actuels
    const center = rectangleLayer.getCenter();
    const corners = rectangleLayer.getRotatedCorners();
    const midPointPositions = rectangleLayer.getMidPoints();

    // Point central (vert)
    const centerPoint = createControlPoint(center, '#059669');
    activeControlPoints.push(centerPoint);

    // Ajouter les mesures au point central
    addMeasureEvents(centerPoint, rectangleLayer, () => {
      const { width, height } = rectangleLayer.getDimensions();
      const area = width * height;
      const rotation = rectangleLayer.getRotation();
      return [
        formatMeasure(width, 'm', 'Largeur'),
        formatMeasure(height, 'm', 'Hauteur'),
        formatMeasure(area, 'm²', 'Surface'),
        `Rotation: ${rotation.toFixed(1)}°`
      ].join('<br>');
    });

    // Point de rotation (orange)
    const rotationPoint = createControlPoint(
      L.latLng(
        center.lat + (corners[0].lat - center.lat) * 1.2,
        center.lng + (corners[0].lng - center.lng) * 1.2
      ),
      '#F97316'
    );
    activeControlPoints.push(rotationPoint);

    // Ligne de rotation
    const rotationLine = L.polyline([center, rotationPoint.getLatLng()], {
      color: '#F97316',
      weight: 1,
      opacity: 0.6,
      dashArray: '4',
      pmIgnore: true
    });
    controlPointsGroup.value?.addLayer(rotationLine);

    // Points de coin (rouge)
    const cornerPoints = corners.map((corner) => {
      const cornerPoint = createControlPoint(corner, '#DC2626');
      activeControlPoints.push(cornerPoint);

      // Ajouter les mesures aux coins
      addMeasureEvents(cornerPoint, rectangleLayer, () => {
        const { width, height } = rectangleLayer.getDimensions();
        return [
          formatMeasure(width, 'm', 'Largeur'),
          formatMeasure(height, 'm', 'Hauteur')
        ].join('<br>');
      });

      // Désactivé: Gestion du redimensionnement via les points de coin
      // Les points de coin sont toujours visibles mais ne permettent plus de redimensionner

      return cornerPoint;
    });

    // Points milieux (bleu)
    const midPointMarkers = midPointPositions.map((midPoint, index) => {
      const midPointMarker = createControlPoint(midPoint, '#2b6451');
      activeControlPoints.push(midPointMarker);

      // Ajouter les mesures aux points milieux
      addMeasureEvents(midPointMarker, rectangleLayer, () => {
        const { width, height } = rectangleLayer.getDimensions();
        const sideLength = index % 2 === 0 ? width : height;
        return [
          formatMeasure(sideLength, 'm', 'Longueur du côté'),
          formatMeasure(sideLength / 2, 'm', 'Distance au coin')
        ].join('<br>');
      });

      // Désactivé: Gestion du redimensionnement via les points milieux
      // Les points milieux sont toujours visibles mais ne permettent plus de redimensionner

      return midPointMarker;
    });

    // Gestion du déplacement via le point central
    centerPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!map.value) return;
      L.DomEvent.stopPropagation(e);
      map.value.dragging.disable();
      let isDragging = true;

      const onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!isDragging) return;
        rectangleLayer.moveFromCenter(e.latlng);

        // Mettre à jour les positions des points de contrôle
        const newCorners = rectangleLayer.getRotatedCorners();
        const newMidPoints = rectangleLayer.getMidPoints();

        // Mettre à jour tous les points de contrôle
        cornerPoints.forEach((point, i) => point.setLatLng(newCorners[i]));
        midPointMarkers.forEach((point, i) => point.setLatLng(newMidPoints[i]));
        centerPoint.setLatLng(e.latlng);

        // Mettre à jour le point et la ligne de rotation
        const newRotationPoint = L.latLng(
          e.latlng.lat + (newCorners[0].lat - e.latlng.lat) * 1.2,
          e.latlng.lng + (newCorners[0].lng - e.latlng.lng) * 1.2
        );
        rotationPoint.setLatLng(newRotationPoint);
        rotationLine.setLatLngs([e.latlng, newRotationPoint]);
      };

      const onMouseUp = () => {
        isDragging = false;
        if (!map.value) return;
        map.value.off('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        map.value.dragging.enable();

        rectangleLayer.updateProperties();
        selectedShape.value = null;
        nextTick(() => {
          selectedShape.value = rectangleLayer;
        });
      };

      map.value.on('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Gestion de la rotation
    rotationPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!map.value) return;
      L.DomEvent.stopPropagation(e);
      map.value.dragging.disable();
      let isDragging = false;

      const initialMouseLatLng = e.latlng;
      const initialRotation = rectangleLayer.getRotation();
      const centerLatLng = rectangleLayer.getCenter();

      const dx = initialMouseLatLng.lng - centerLatLng.lng;
      const dy = initialMouseLatLng.lat - centerLatLng.lat;
      const initialAngle = Math.atan2(dy, dx) * 180 / Math.PI;

      // Cacher tous les points de contrôle sauf le point de rotation
      activeControlPoints.forEach((point) => {
        if (point !== rotationPoint) {
          point.setStyle({ opacity: 0, fillOpacity: 0 });
          if (point.measureDiv) {
            point.measureDiv.style.display = 'none';
          }
        }
      });

      const onMouseMove = throttle((e: L.LeafletMouseEvent) => {
        if (!isDragging) {
          isDragging = true;
        }

        const dx = e.latlng.lng - centerLatLng.lng;
        const dy = e.latlng.lat - centerLatLng.lat;
        const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;

        let deltaAngle = currentAngle - initialAngle;
        let newRotation = (initialRotation + deltaAngle) % 360;
        if (newRotation < 0) newRotation += 360;

        // Mettre à jour la rotation sans recalculer les propriétés
        rectangleLayer.setRotation(newRotation, false);

        // Mettre à jour uniquement le point et la ligne de rotation
        rotationPoint.setLatLng(e.latlng);
        rotationLine.setLatLngs([centerLatLng, e.latlng]);
      }, 16); // Throttle à ~60fps

      const onMouseUp = () => {
        if (!map.value) return;
        map.value.off('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        map.value.dragging.enable();

        // Forcer une mise à jour finale des propriétés seulement à la fin
        if (isDragging) {
          rectangleLayer.finalizeRotation();
        }

        selectedShape.value = null;
        nextTick(() => {
          selectedShape.value = rectangleLayer;
          // Réafficher tous les points de contrôle à la fin de la rotation
          clearActiveControlPoints();
          updateRectangleControlPoints(rectangleLayer);
        });
      };

      map.value.on('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Écouter les événements de mise à jour des coordonnées
    rectangleLayer.on('coordinates:updated', (e: any) => {
      const { corners, center } = e;
      const midPoints = rectangleLayer.getMidPoints();

      // Mettre à jour tous les points de contrôle
      cornerPoints.forEach((point, i) => point.setLatLng(corners[i]));
      midPointMarkers.forEach((point, i) => point.setLatLng(midPoints[i]));
      centerPoint.setLatLng(center);

      // Mettre à jour le point et la ligne de rotation
      const newRotationPoint = L.latLng(
        center.lat + (corners[0].lat - center.lat) * 1.2,
        center.lng + (corners[0].lng - center.lng) * 1.2
      );
      rotationPoint.setLatLng(newRotationPoint);
      rotationLine.setLatLngs([center, newRotationPoint]);
    });
  };
  // Fonction pour mettre à jour les points de contrôle d'une ligne
  const updateLineControlPoints = (layer: L.Polyline) => {
    if (!map.value || !featureGroup.value) {
      return;
    }

    // Nettoyer les points de contrôle existants
    clearActiveControlPoints();

    // Récupérer les points à jour
    const points = layer.getLatLngs() as L.LatLng[];
    if (!points || points.length === 0) {
      console.warn('Pas de points pour la ligne');
      return;
    }

    // Point central (vert)
    let centerPoint: ControlPoint | null = null;
    if (layer instanceof Line) {
      const center = layer.getCenter();
      centerPoint = createControlPoint(center, '#059669') as ControlPoint;
      activeControlPoints.push(centerPoint);

      // Ajouter les mesures au point central
      addMeasureEvents(centerPoint, layer, () => {
        const totalLength = layer.getLength() || 0;
        return formatMeasure(totalLength, 'm', 'Longueur totale');
      });

      // Gestion du déplacement via le point central
      centerPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
        if (!map.value) return;

        L.DomEvent.stopPropagation(e);
        map.value.dragging.disable();
        let isDragging = true;

        // Stocker les positions initiales
        const startLatLngs = (layer.getLatLngs() as L.LatLng[]).map(p => L.latLng(p.lat, p.lng));
        const startMousePoint = e.latlng;

        // Désactiver temporairement les écouteurs d'événements de mise à jour
        if (layer instanceof Line) {
          layer.off('move:end');
          layer.off('vertex:moved');
          layer.off('latlngs:updated');
          layer.off('properties:updated');
        }

        // Cacher tous les points de contrôle sauf le point central
        activeControlPoints.forEach((point, index) => {
          if (index > 0) { // Ne pas cacher le point central
            point.setStyle({ opacity: 0, fillOpacity: 0 });
            if (point.measureDiv) {
              point.measureDiv.style.display = 'none';
            }
          }
        });

        const onMouseMove = (e: L.LeafletMouseEvent) => {
          if (!isDragging) return;

          // Calculer le déplacement relatif depuis le début du drag
          const dx = e.latlng.lng - startMousePoint.lng;
          const dy = e.latlng.lat - startMousePoint.lat;

          // Appliquer le déplacement à tous les points de la ligne
          const newLatLngs = startLatLngs.map(p =>
            L.latLng(p.lat + dy, p.lng + dx)
          );

          // Mettre à jour la ligne sans déclencher d'événements
          L.Polyline.prototype.setLatLngs.call(layer, newLatLngs);

          // Mettre à jour la position du point central pour qu'il suive exactement la souris
          centerPoint?.setLatLng(e.latlng);
        };

        // Utiliser throttle pour limiter les mises à jour
        const throttledMove = throttle(onMouseMove, 16);

        const onMouseUp = () => {
          isDragging = false;
          if (!map.value) return;

          map.value.off('mousemove', throttledMove);
          document.removeEventListener('mouseup', onMouseUp);
          map.value.dragging.enable();

          // Mettre à jour les propriétés
          if (layer instanceof Line) {
            // Réactiver les écouteurs d'événements
            const updateControlPoints = () => {
              clearActiveControlPoints();
              updateLineControlPoints(layer);
            };

            layer.on('move:end', updateControlPoints);
            layer.on('vertex:moved', updateControlPoints);
            layer.on('latlngs:updated', updateControlPoints);
            layer.on('properties:updated', updateControlPoints);

            // Mettre à jour les propriétés
            layer.updateProperties();
            updateLayerProperties(layer, 'Line');
          }

          // Forcer la mise à jour des points de contrôle
          clearActiveControlPoints();
          updateLineControlPoints(layer);
        };

        map.value.on('mousemove', throttledMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // Points d'extrémité (rouge)
    points.forEach((point, i) => {
      const pointMarker = createControlPoint(point, '#DC2626') as ControlPoint;
      activeControlPoints.push(pointMarker);

      // Ajouter les mesures
      addMeasureEvents(pointMarker, layer, () => {
        if (layer instanceof Line) {
          const totalLength = layer.getLength() || 0;
          const distanceFromStart = layer.getLengthToVertex(i);
          return [
            formatMeasure(distanceFromStart, 'm', 'Distance depuis le début'),
            formatMeasure(totalLength, 'm', 'Longueur totale')
          ].join('<br>');
        }
        return '';
      });

      // Gestion du déplacement des points d'extrémité
      pointMarker.on('mousedown', (e: L.LeafletMouseEvent) => {
        if (!map.value) return;

        L.DomEvent.stopPropagation(e);
        map.value.dragging.disable();
        let isDragging = true;

        // Désactiver temporairement les écouteurs d'événements de mise à jour
        if (layer instanceof Line) {
          layer.off('move:end');
          layer.off('vertex:moved');
          layer.off('latlngs:updated');
          layer.off('properties:updated');
        }

        // Cacher tous les points de contrôle sauf celui en cours de déplacement
        activeControlPoints.forEach((point, index) => {
          if (index !== i + 1) { // +1 car le point central est en position 0
            point.setStyle({ opacity: 0, fillOpacity: 0 });
            if (point.measureDiv) {
              point.measureDiv.style.display = 'none';
            }
          }
        });

        const onMouseMove = throttle((e: L.LeafletMouseEvent) => {
          if (!isDragging) return;

          // Récupérer les points actuels
          const currentPoints = layer.getLatLngs() as L.LatLng[];
          // Mettre à jour uniquement le point déplacé
          currentPoints[i] = e.latlng;
          // Mettre à jour la ligne sans déclencher d'événements
          L.Polyline.prototype.setLatLngs.call(layer, currentPoints);

          // Mettre à jour la position du point de contrôle
          pointMarker.setLatLng(e.latlng);
        }, 16);

        const onMouseUp = () => {
          isDragging = false;
          if (!map.value) return;

          map.value.off('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          map.value.dragging.enable();

          // Mettre à jour les propriétés
          if (layer instanceof Line) {
            // Réactiver les écouteurs d'événements
            const updateControlPoints = () => {
              clearActiveControlPoints();
              updateLineControlPoints(layer);
            };

            layer.on('move:end', updateControlPoints);
            layer.on('vertex:moved', updateControlPoints);
            layer.on('latlngs:updated', updateControlPoints);
            layer.on('properties:updated', updateControlPoints);

            // Mettre à jour les propriétés
            layer.updateProperties();
            updateLayerProperties(layer, 'Line');
          }

          // Forcer la mise à jour complète des points de contrôle
          clearActiveControlPoints();
          updateLineControlPoints(layer);
        };

        map.value.on('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });

    // Points milieux (bleu)
    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midPoint = L.latLng(
          (p1.lat + p2.lat) / 2,
          (p1.lng + p2.lng) / 2
        );

        const midPointMarker = createControlPoint(midPoint, '#2b6451');
        activeControlPoints.push(midPointMarker);

        // Ajouter les mesures
        addMeasureEvents(midPointMarker, layer, () => {
          if (layer instanceof Line) {
            const segmentLength = layer.getSegmentLengthAt(i);
            const totalLength = layer.getLength() || 0;
            const distanceFromStart = layer.getLengthToVertex(i) + segmentLength / 2;
            return [
              formatMeasure(segmentLength, 'm', 'Longueur du segment'),
              formatMeasure(segmentLength / 2, 'm', 'Demi-segment'),
              formatMeasure(distanceFromStart, 'm', 'Distance depuis le début'),
              formatMeasure(totalLength, 'm', 'Longueur totale')
            ].join('<br>');
          }
          return '';
        });
      }
    }

    // Ajouter les écouteurs d'événements pour la synchronisation
    if (layer instanceof Line) {
      const updateControlPoints = () => {
        clearActiveControlPoints();
        updateLineControlPoints(layer);
      };

      // Écouter les événements de déplacement
      layer.on('move:start', () => {
        // Cacher tous les points de contrôle sauf le point central
        activeControlPoints.forEach((point, index) => {
          if (index > 0) {
            point.setStyle({ opacity: 0, fillOpacity: 0 });
            if (point.measureDiv) {
              point.measureDiv.style.display = 'none';
            }
          }
        });
      });

      layer.on('move:end', updateControlPoints);
      layer.on('vertex:moved', updateControlPoints);
      layer.on('latlngs:updated', updateControlPoints);
      layer.on('properties:updated', updateControlPoints);

      // Stocker la fonction de nettoyage
      (activeControlPoints as any).cleanup = () => {
        layer.off('move:start', () => { });
        layer.off('move:end', updateControlPoints);
        layer.off('vertex:moved', updateControlPoints);
        layer.off('latlngs:updated', updateControlPoints);
        layer.off('properties:updated', updateControlPoints);
      };
    }
  };
  // Mettre à jour la fonction updatePolygonControlPoints pour ajouter plus de mesures
  const updatePolygonControlPoints = (layer: L.Polygon) => {
    if (!map.value || !featureGroup.value) {
      return;
    }
    clearActiveControlPoints();
    const points = (layer.getLatLngs()[0] as L.LatLng[]);
    // Convertir les points en format GeoJSON pour turf
    const coordinates = points.map(point => [point.lng, point.lat]);
    coordinates.push(coordinates[0]); // Fermer le polygone
    const polygonGeom = polygon([coordinates]);
    const areaValue = area(polygonGeom);
    const perimeter = points.reduce((acc, curr, idx) => {
      const nextPoint = points[(idx + 1) % points.length];
      return acc + curr.distanceTo(nextPoint);
    }, 0);
    // Point central (vert)
    let center: L.LatLng;
    if (typeof layer.getCenter === 'function') {
      try {
        center = layer.getCenter();
      } catch (error) {
        console.warn('Erreur lors de la récupération du centre du polygone via getCenter(), utilisation de la méthode alternative', error);
        // Calculer le centre manuellement
        const centroidPoint = centroid(polygonGeom);
        center = L.latLng(centroidPoint.geometry.coordinates[1], centroidPoint.geometry.coordinates[0]);
      }
    } else {
      // Calculer le centre manuellement si la méthode getCenter n'existe pas
      const centroidPoint = centroid(polygonGeom);
      center = L.latLng(centroidPoint.geometry.coordinates[1], centroidPoint.geometry.coordinates[0]);
    }
    // Créer le point central (vert)
    const centerPoint = createControlPoint(center, '#059669') as ControlPoint;
    activeControlPoints.push(centerPoint);
    // Ajouter les mesures au point central
    addMeasureEvents(centerPoint, layer, () => {
      return [
        formatMeasure(perimeter, 'm', 'Périmètre'),
        formatMeasure(areaValue, 'm²', 'Surface')
      ].join('<br>');
    });
    // Gestion du déplacement via le point central
    centerPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!map.value) {
        return;
      }
      L.DomEvent.stopPropagation(e);
      map.value.dragging.disable();
      let isDragging = true;
      const startPoint = e.latlng;
      // Sauvegarder les points originaux
      const originalPoints = [...points];
      // Cacher tous les points de contrôle sauf le point central pendant le déplacement
      activeControlPoints.forEach((point, index) => {
        if (index > 0) { // Ne pas cacher le point central
          point.setStyle({ opacity: 0, fillOpacity: 0 });
        }
      });
      // Fonction throttlée pour limiter les mises à jour pendant le déplacement
      const throttledMove = throttle((moveEvent: L.LeafletMouseEvent) => {
        if (!isDragging) return;
        // Calculer le déplacement par rapport au point initial
        const dx = moveEvent.latlng.lng - startPoint.lng;
        const dy = moveEvent.latlng.lat - startPoint.lat;
        // Déplacer tous les points du polygone
        const newPoints = originalPoints.map(point =>
          L.latLng(
            point.lat + dy,
            point.lng + dx
          )
        );
        // Mettre à jour la géométrie sans triggering centroid recalculation
        L.Polygon.prototype.setLatLngs.call(layer, [newPoints]);
        // Mettre à jour uniquement le point central
        centerPoint.setLatLng(moveEvent.latlng);
      }, 16); // 60fps
      const onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!isDragging) {
          return;
        }
        // Utiliser la version throttlée
        throttledMove(e);
      };
      const onMouseUp = () => {
        isDragging = false;
        if (!map.value) {
          return;
        }
        map.value.off('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        map.value.dragging.enable();
        // Forcer la mise à jour des propriétés de la forme à la fin de l'opération
        if (layer.properties) {
          // Récupérer les points actuels
          const currentPoints = (layer.getLatLngs()[0] as L.LatLng[]);
          // Recalculer les propriétés à jour
          const coords = currentPoints.map(p => [p.lng, p.lat]);
          coords.push(coords[0]); // Fermer le polygone
          const polygonGeom = polygon([coords]);
          // Mettre à jour les propriétés importantes
          layer.properties.area = area(polygonGeom);
          layer.properties.perimeter = currentPoints.reduce((acc, curr, idx) => {
            const nextPoint = currentPoints[(idx + 1) % currentPoints.length];
            return acc + curr.distanceTo(nextPoint);
          }, 0);
          layer.properties.surface = layer.properties.area;
        }
        // Récréer tous les points de contrôle pour assurer la cohérence
        clearActiveControlPoints();
        updatePolygonControlPoints(layer);
        // Mise à jour de selectedShape pour déclencher la réactivité
        selectedShape.value = null; // Forcer un reset
        nextTick(() => {
          selectedShape.value = layer;
        });
      };
      map.value.on('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    // Points de sommet (rouge pour harmonisation)
    points.forEach((point, i) => {
      const pointMarker = createControlPoint(point, '#DC2626');
      activeControlPoints.push(pointMarker);
      // Ajouter les mesures aux sommets
      addMeasureEvents(pointMarker, layer, () => {
        const prevPoint = points[(i - 1 + points.length) % points.length];
        const nextPoint = points[(i + 1) % points.length];
        const distanceToPrev = point.distanceTo(prevPoint);
        const distanceToNext = point.distanceTo(nextPoint);
        return [
          formatMeasure(distanceToPrev, 'm', 'Distance au point précédent'),
          formatMeasure(distanceToNext, 'm', 'Distance au point suivant'),
          formatMeasure(perimeter, 'm', 'Périmètre total'),
          formatMeasure(areaValue, 'm²', 'Surface')
        ].join('<br>');
      });
      pointMarker.on('mousedown', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (!map.value) {
          return;
        }
        map.value.dragging.disable();
        let isDragging = true;
        // Cacher le point central pendant la modification
        if (centerPoint) {
          centerPoint.setStyle({ opacity: 0, fillOpacity: 0 });
          if (centerPoint.measureDiv) {
            centerPoint.measureDiv.style.display = 'none';
          }
        }
        // Fonction throttlée pour limiter les mises à jour pendant le déplacement du vertex
        const throttledDrag = throttle((dragEvent: L.LeafletMouseEvent) => {
          if (!isDragging) return;
          // Mettre à jour uniquement le point déplacé
          points[i] = dragEvent.latlng;
          L.Polygon.prototype.setLatLngs.call(layer, [points]);
          pointMarker.setLatLng(dragEvent.latlng);
          // Mettre à jour les deux points milieux adjacents uniquement
          const midPointMarkers = activeControlPoints.slice(points.length + 1);
          // Point milieu précédent
          const prevIdx = (i - 1 + points.length) % points.length;
          const prevMidPoint = midPointMarkers[prevIdx];
          if (prevMidPoint) {
            const p1 = points[prevIdx];
            const p2 = points[i];
            const midPoint = L.latLng(
              (p1.lat + p2.lat) / 2,
              (p1.lng + p2.lng) / 2
            );
            prevMidPoint.setLatLng(midPoint);
          }
          // Point milieu suivant
          const nextMidPoint = midPointMarkers[i];
          if (nextMidPoint) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const midPoint = L.latLng(
              (p1.lat + p2.lat) / 2,
              (p1.lng + p2.lng) / 2
            );
            nextMidPoint.setLatLng(midPoint);
          }
        }, 16); // 60fps
        const onMouseMove = (e: L.LeafletMouseEvent) => {
          if (!isDragging) {
            return;
          }
          // Utiliser la version throttlée
          throttledDrag(e);
        };
        const onMouseUp = () => {
          isDragging = false;
          if (!map.value) {
            return;
          }
          map.value.off('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          map.value.dragging.enable();
          // Forcer la mise à jour des propriétés de la forme à la fin de l'opération
          if (layer.properties) {
            // Recalculer les propriétés à jour
            const coords = (layer.getLatLngs()[0] as L.LatLng[]).map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // Fermer le polygone
            const polygonGeom = polygon([coords]);
            // Mettre à jour les propriétés importantes
            layer.properties.area = area(polygonGeom);
            layer.properties.perimeter = points.reduce((acc, curr, idx) => {
              const nextPoint = points[(idx + 1) % points.length];
              return acc + curr.distanceTo(nextPoint);
            }, 0);
            layer.properties.surface = layer.properties.area;
          }
          // Recréer tous les points de contrôle pour assurer la cohérence
          clearActiveControlPoints();
          updatePolygonControlPoints(layer);
          // Mise à jour de selectedShape pour déclencher la réactivité
          selectedShape.value = null; // Forcer un reset
          nextTick(() => {
            selectedShape.value = layer;
          });
        };
        map.value.on('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
    // Points milieux (bleu)
    const updateMidPoints = () => {
      const points = (layer.getLatLngs()[0] as L.LatLng[]);
      // Supprimer les anciens points milieux
      activeControlPoints.slice(points.length + 1).forEach(point => {  // +1 pour le point central
        if (controlPointsGroup.value) {
          controlPointsGroup.value.removeLayer(point);
        }
      });
      activeControlPoints = activeControlPoints.slice(0, points.length + 1);  // +1 pour le point central
      // Créer tous les points milieux d'un coup pour améliorer les performances
      // Calculer tous les points milieux d'avance
      const midPoints = new Array(points.length);
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        midPoints[i] = getMidPoint(p1, p2);
      }
      // Créer maintenant tous les markers
      midPoints.forEach((midPoint, i) => {
        const midPointMarker = createControlPoint(midPoint, '#2b6451');
        activeControlPoints.push(midPointMarker);
        // Ajouter les mesures aux points milieux
        addMeasureEvents(midPointMarker, layer, () => {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          const segmentLength = p1.distanceTo(p2);
          return [
            formatMeasure(segmentLength, 'm', 'Longueur du segment'),
            formatMeasure(perimeter, 'm', 'Périmètre total'),
            formatMeasure(areaValue, 'm²', 'Surface')
          ].join('<br>');
        });
        // Gestion de l'ajout de vertex
        midPointMarker.on('mousedown', (e: L.LeafletMouseEvent) => {
          if (!map.value) {
            return;
          }
          L.DomEvent.stopPropagation(e);
          map.value.dragging.disable();
          let isDragging = true;
          const currentIndex = i;
          // Cacher le point central pendant l'opération
          if (centerPoint) {
            centerPoint.setStyle({ opacity: 0, fillOpacity: 0 });
            if (centerPoint.measureDiv) {
              centerPoint.measureDiv.style.display = 'none';
            }
          }
          // Ajout initial du point à la position exacte du milieu
          const currentPoints = [...(layer.getLatLngs()[0] as L.LatLng[])];
          // Ajouter le nouveau point en position fixe
          currentPoints.splice((currentIndex + 1) % currentPoints.length, 0, midPoint);
          // Mettre à jour la géométrie avec le nouveau point
          layer.setLatLngs([currentPoints]);
          // Récréer immédiatement tous les points de contrôle
          // pour avoir accès au nouveau point créé
          clearActiveControlPoints();
          updatePolygonControlPoints(layer);
          // Récupérer le nouveau point dans la liste mise à jour des points actifs
          // Le nouveau point sera à la position i+1 dans la liste des sommets
          const newVertexIndex = currentIndex + 1;
          const newVertexOffset = 1 + newVertexIndex; // +1 pour le point central
          const newVertexMarker = newVertexIndex < activeControlPoints.length - 1 ?
            activeControlPoints[newVertexOffset] : null;
          // Si on a bien trouvé le nouveau point, on va déplacer ce point spécifique
          if (newVertexMarker) {
            const onMouseMove = (e: L.LeafletMouseEvent) => {
              if (!isDragging) {
                return;
              }
              // Récupérer la liste actuelle des points
              const currentPoints = (layer.getLatLngs()[0] as L.LatLng[]);
              // Modifier uniquement la position du sommet concerné
              currentPoints[newVertexIndex] = e.latlng;
              // Appliquer les modifications avec la méthode standard pour déclencher les mises à jour
              layer.setLatLngs([currentPoints]);
              // Mettre à jour la position visuelle du marqueur
              newVertexMarker.setLatLng(e.latlng);
              // Mettre à jour uniquement les points milieu affectés (avant et après le nouveau point)
              const midPoints = activeControlPoints.slice(1 + currentPoints.length);
              const prevMidIndex = (newVertexIndex - 1 + currentPoints.length) % currentPoints.length;
              const nextMidIndex = newVertexIndex;
              // Mise à jour du point milieu précédent
              if (midPoints[prevMidIndex]) {
                const p1 = currentPoints[prevMidIndex];
                const p2 = currentPoints[newVertexIndex];
                const midPoint = L.latLng(
                  (p1.lat + p2.lat) / 2,
                  (p1.lng + p2.lng) / 2
                );
                midPoints[prevMidIndex].setLatLng(midPoint);
              }
              // Mise à jour du point milieu suivant
              if (midPoints[nextMidIndex]) {
                const p1 = currentPoints[newVertexIndex];
                const p2 = currentPoints[(newVertexIndex + 1) % currentPoints.length];
                const midPoint = L.latLng(
                  (p1.lat + p2.lat) / 2,
                  (p1.lng + p2.lng) / 2
                );
                midPoints[nextMidIndex].setLatLng(midPoint);
              }
            };
            const onMouseUp = () => {
              isDragging = false;
              if (!map.value) {
                return;
              }
              map.value.off('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              map.value.dragging.enable();
              // Forcer la mise à jour des propriétés de la forme
              if (layer.properties) {
                // Recalculer les propriétés à jour
                const coords = (layer.getLatLngs()[0] as L.LatLng[]).map(p => [p.lng, p.lat]);
                coords.push(coords[0]); // Fermer le polygone
                const polygonGeom = polygon([coords]);
                // Mettre à jour les propriétés importantes
                layer.properties.area = area(polygonGeom);
                layer.properties.perimeter = (layer.getLatLngs()[0] as L.LatLng[]).reduce((acc, curr, idx, arr) => {
                  const nextPoint = arr[(idx + 1) % arr.length];
                  return acc + curr.distanceTo(nextPoint);
                }, 0);
              }
              // Recréer tous les points de contrôle pour une cohérence complète
              clearActiveControlPoints();
              updatePolygonControlPoints(layer);
              // Mise à jour de selectedShape pour déclencher la réactivité
              selectedShape.value = null;
              nextTick(() => {
                selectedShape.value = layer;
              });
            };
            map.value.on('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          } else {
            // Si on n'a pas trouvé le point (cas d'erreur), on nettoie
            map.value.dragging.enable();
            clearActiveControlPoints();
            updatePolygonControlPoints(layer);
          }
        });
      });
    };
    updateMidPoints();
  };
  // Fonction pour mettre à jour les points de contrôle d'un demi-cercle - supprimée selon les exigences
  // Cette fonction est conservée pour maintenir la compatibilité avec le code existant
  const updateSemicircleControlPoints = (_: any) => {
    // Fonction supprimée selon les exigences
    console.log('updateSemicircleControlPoints est désactivé selon les exigences');
  };

  // Fonction pour mettre à jour les points de contrôle d'une note géolocalisée
  const updateGeoNoteControlPoints = (layer: GeoNote) => {
    if (!map.value || !featureGroup.value) return;

    // Nettoyer les points de contrôle existants
    clearActiveControlPoints();

    // Récupérer la position de la note
    const position = layer.getLatLng();

    // Créer un point de contrôle central (vert) pour déplacer la note
    const centerPoint = createControlPoint(position, '#059669') as ControlPoint;
    activeControlPoints.push(centerPoint);

    // Ajouter les mesures au point central
    addMeasureEvents(centerPoint, layer, () => {
      return `Position: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
    });

    // Gestion du déplacement via le point central
    centerPoint.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (!map.value) return;

      // Arrêter la propagation de l'événement
      L.DomEvent.stopPropagation(e);

      // Désactiver le déplacement de la carte pendant le déplacement du point
      map.value.dragging.disable();

      // Indiquer que la note est en cours de déplacement
      layer.startMoving();

      // Variable pour suivre l'état du déplacement
      let isDragging = true;

      // Fonction pour gérer le déplacement
      const onMouseMove = (moveEvent: L.LeafletMouseEvent) => {
        if (!isDragging) return;

        // Mettre à jour la position du point de contrôle
        centerPoint.setLatLng(moveEvent.latlng);

        // Mettre à jour la position de la note
        layer.setLatLng(moveEvent.latlng);
      };

      // Fonction throttlée pour limiter les mises à jour pendant le déplacement
      const throttledMove = throttle(onMouseMove, 16); // 60fps

      // Fonction pour gérer la fin du déplacement
      const onMouseUp = () => {
        if (!map.value) return;

        // Arrêter d'écouter les événements de déplacement
        map.value.off('mousemove', throttledMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Réactiver le déplacement de la carte
        map.value.dragging.enable();

        // Indiquer que le déplacement est terminé
        isDragging = false;

        // Finaliser le déplacement de la note
        layer.finishMoving();

        // Forcer la mise à jour des propriétés
        layer.updateProperties();

        // Mettre à jour selectedShape pour déclencher la réactivité
        selectedShape.value = null; // Forcer un reset
        nextTick(() => {
          selectedShape.value = layer;

          // Récréer les points de contrôle
          clearActiveControlPoints();
          updateGeoNoteControlPoints(layer);
        });
      };

      // Ajouter les écouteurs d'événements
      map.value.on('mousemove', throttledMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Synchroniser selectedShape au démarrage de la fonction
    selectedShape.value = layer;
  };
  // Fonction pour générer les points de contrôle temporaires
  const generateTempControlPoints = (layer: L.Layer) => {
    if (!map.value || !tempControlPointsGroup.value) {
      return;
    }

    console.log('[generateTempControlPoints] Génération des points temporaires pour', {
      layerType: layer.constructor.name,
      properties: layer.properties
    });

    // Supprimer les points temporaires existants
    tempControlPointsGroup.value.clearLayers();

    try {
      // Traitement selon le type de forme
      if (layer instanceof Rectangle) {
        // Utiliser la nouvelle méthode pour générer les points d'aide
        layer.generateHelperPoints(map.value);
      }
      else if (layer instanceof Circle) {
        // Points de contrôle pour les cercles et variantes
        if ('getLatLng' in layer && typeof layer.getLatLng === 'function') {
          const center = layer.getLatLng();
          if (center) {
            // Point central (vert)
            const centerPoint = L.circleMarker(center, {
              radius: 5,
              color: '#059669',
              fillColor: '#059669',
              fillOpacity: 0.7,
              weight: 2,
              className: 'temp-control-point',
              pmIgnore: true
            });
            tempControlPointsGroup.value.addLayer(centerPoint);
          }
        }
      }
      else if (layer instanceof GeoNote) {
        // Points de contrôle pour les notes géolocalisées
        const position = layer.getLatLng();
        if (position) {
          // Point central (vert) pour indiquer la possibilité de déplacement
          const centerPoint = L.circleMarker(position, {
            radius: 5,
            color: '#059669',
            fillColor: '#059669',
            fillOpacity: 0.7,
            weight: 2,
            className: 'temp-control-point',
            pmIgnore: true
          });
          tempControlPointsGroup.value.addLayer(centerPoint);
        }
      }
      else if (layer instanceof Polygon || layer instanceof L.Polygon) {
        // Récupérer les points du polygone
        let points: L.LatLng[] = [];

        if ('getLatLngs' in layer) {
          const latLngs = layer.getLatLngs();
          if (Array.isArray(latLngs) && latLngs.length > 0) {
            const firstLayer = latLngs[0];
            if (Array.isArray(firstLayer)) {
              points = firstLayer as L.LatLng[];
            } else if (firstLayer instanceof L.LatLng) {
              points = latLngs as L.LatLng[];
            }
          }
        }

        // Point central (vert)
        let center: L.LatLng | null = null;

        if (layer instanceof Polygon && typeof layer.getCenter === 'function') {
          center = layer.getCenter();
        } else if (points.length > 0) {
          // Calculer le centre manuellement pour les polygones standard
          const coordinates = points.map(point => [point.lng, point.lat]);
          coordinates.push(coordinates[0]); // Fermer le polygone
          const polygonGeom = polygon([coordinates]);
          const centroidPoint = centroid(polygonGeom);
          center = L.latLng(
            centroidPoint.geometry.coordinates[1],
            centroidPoint.geometry.coordinates[0]
          );
        }

        if (center) {
          const tempCenterPoint = L.circleMarker(center, {
            radius: 5,
            color: '#059669',
            fillColor: '#059669',
            fillOpacity: 0.7,
            weight: 2,
            className: 'temp-control-point',
            pmIgnore: true
          });
          tempControlPointsGroup.value.addLayer(tempCenterPoint);
        }

        // Points de sommet (rouge)
        points.forEach(point => {
          if (point) {
            const tempPoint = L.circleMarker(point, {
              radius: 5,
              color: '#DC2626',
              fillColor: '#DC2626',
              fillOpacity: 0.7,
              weight: 2,
              className: 'temp-control-point',
              pmIgnore: true
            });
            tempControlPointsGroup.value.addLayer(tempPoint);
          }
        });

        // Points milieux (bleu)
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          if (p1 && p2) {
            const midPoint = L.latLng(
              (p1.lat + p2.lat) / 2,
              (p1.lng + p2.lng) / 2
            );
            const tempMidPoint = L.circleMarker(midPoint, {
              radius: 5,
              color: '#2563EB',
              fillColor: '#2563EB',
              fillOpacity: 0.7,
              weight: 2,
              className: 'temp-control-point',
              pmIgnore: true
            });
            tempControlPointsGroup.value.addLayer(tempMidPoint);
          }
        }
      }

      console.log('[generateTempControlPoints] Points temporaires générés', {
        count: tempControlPointsGroup.value.getLayers().length
      });
    } catch (error) {
      console.error('[generateTempControlPoints] Erreur lors de la génération des points temporaires:', error);
    }
  };
  // Fonction pour gérer les points de contrôle du TextRectangle - supprimée selon les exigences
  // Cette fonction est conservée pour maintenir la compatibilité avec le code existant
  const updateTextRectangleControlPoints = (_: any) => {
    // Fonction supprimée selon les exigences
    console.log('updateTextRectangleControlPoints est désactivé selon les exigences');
  };
  const calculateTotalCoverageArea = (layers: L.Layer[]): number => {
    console.log('Nombre total de couches:', layers.length);

    // Filtrer les couches valides et afficher leurs propriétés
    const validLayers = layers.filter(layer => {
      if (!layer) return false;

      let surface = 0;
      let dimensions = { width: 0, height: 0 };

      if (layer instanceof L.Circle) {
        surface = Math.PI * Math.pow((layer as any).getRadius(), 2);
        const radius = (layer as any).getRadius();
        console.log('\nForme détectée: Circle');
        console.log(`- Surface propre: ${surface.toFixed(2)} m²`);
        console.log(`- Rayon: ${radius.toFixed(2)} m`);
        console.log(`- Angle: Cercle complet (360°)`);
      } else if (layer instanceof Rectangle || layer instanceof L.Rectangle) {
        const bounds = (layer as L.Rectangle).getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // Calculer la largeur et la hauteur en mètres
        const widthLine = lineString([[sw.lng, sw.lat], [ne.lng, sw.lat]]);
        const heightLine = lineString([[sw.lng, sw.lat], [sw.lng, ne.lat]]);
        dimensions.width = length(widthLine, { units: 'meters' });
        dimensions.height = length(heightLine, { units: 'meters' });
        surface = dimensions.width * dimensions.height;

        console.log('\nForme détectée: Rectangle');
        console.log(`- Surface propre: ${surface.toFixed(2)} m²`);
        console.log(`- Largeur: ${dimensions.width.toFixed(2)} m`);
        console.log(`- Hauteur: ${dimensions.height.toFixed(2)} m`);
      } else if ((layer as any).properties?.type === 'Semicircle') {
        const startAngle = (layer as any).getStartAngle();
        const stopAngle = (layer as any).getStopAngle();
        const openingAngle = ((stopAngle - startAngle + 360) % 360);
        const radius = (layer as any).getRadius();
        surface = (Math.PI * Math.pow(radius, 2) * openingAngle) / 360;
        console.log('\nForme détectée: Semicircle');
        console.log(`- Surface propre: ${surface.toFixed(2)} m²`);
        console.log(`- Rayon: ${radius.toFixed(2)} m`);
        console.log(`- Angle de début: ${startAngle.toFixed(2)}°`);
        console.log(`- Angle de fin: ${stopAngle.toFixed(2)}°`);
        console.log(`- Angle d'ouverture: ${openingAngle.toFixed(2)}°`);
      }

      return surface > 0;
    });

    // Si aucune forme valide, retourner 0
    if (validLayers.length === 0) return 0;

    // Identifier les groupes de formes connectées
    const processedLayers = new Set<L.Layer>();
    const connectedGroups: L.Layer[][] = [];

    for (const layer of validLayers) {
      if (!processedLayers.has(layer)) {
        const connectedShapes = getConnectedShapes(validLayers, layer);
        if (connectedShapes.length > 0) {
          connectedGroups.push(connectedShapes);
          connectedShapes.forEach(shape => processedLayers.add(shape));
        }
      }
    }

    console.log(`\nNombre de groupes de formes connectées: ${connectedGroups.length}`);

    // Pour chaque groupe, calculer sa surface
    const groupAreas = connectedGroups.map((group, groupIndex) => {
      console.log(`\nCalcul pour le groupe ${groupIndex + 1} (${group.length} formes):`);

      // Convertir les formes du groupe en GeoJSON
      const features = group.map(layer => {
        try {
          let feature: Feature<GeoJSONPolygon, GeoJsonProperties>;
          if (layer instanceof L.Circle) {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            feature = circle([center.lng, center.lat], radius / 1000, {
              units: 'kilometers',
              steps: 256
            }) as unknown as Feature<GeoJSONPolygon, GeoJsonProperties>;
            const geoJsonArea = area(feature);
            const propertyArea = (layer as any).properties?.surface || 0;
            console.log('\nConversion Cercle -> GeoJSON');
            console.log(`- Rayon: ${radius.toFixed(2)}m`);
            console.log(`- Surface propriété: ${propertyArea.toFixed(2)}m²`);
            console.log(`- Surface GeoJSON: ${geoJsonArea.toFixed(2)}m²`);
            return feature;
          } else if (layer instanceof Rectangle || layer instanceof L.Rectangle) {
            const bounds = (layer as L.Rectangle).getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const nw = L.latLng(ne.lat, sw.lng);
            const se = L.latLng(sw.lat, ne.lng);

            const coordinates: [number, number][] = [
              [sw.lng, sw.lat],
              [se.lng, se.lat],
              [ne.lng, ne.lat],
              [nw.lng, nw.lat],
              [sw.lng, sw.lat]
            ];

            feature = polygon([coordinates]) as unknown as Feature<GeoJSONPolygon, GeoJsonProperties>;
            const geoJsonArea = area(feature);

            const widthLine = lineString([[sw.lng, sw.lat], [ne.lng, sw.lat]]);
            const heightLine = lineString([[sw.lng, sw.lat], [sw.lng, ne.lat]]);
            const width = length(widthLine, { units: 'meters' });
            const height = length(heightLine, { units: 'meters' });
            const theoreticalArea = width * height;

            console.log('\nConversion Rectangle -> GeoJSON');
            console.log(`- Largeur: ${width.toFixed(2)}m`);
            console.log(`- Hauteur: ${height.toFixed(2)}m`);
            console.log(`- Surface théorique: ${theoreticalArea.toFixed(2)}m²`);
            console.log(`- Surface GeoJSON: ${geoJsonArea.toFixed(2)}m²`);
            console.log(`- Différence: ${Math.abs(theoreticalArea - geoJsonArea).toFixed(2)}m² (${((Math.abs(theoreticalArea - geoJsonArea) / theoreticalArea) * 100).toFixed(2)}%)`);
            return feature;
          } else if ((layer as any).properties?.type === 'Semicircle') {
            const circleCenter = (layer as any).getCenter();
            const circleRadius = (layer as any).getRadius();
            const startAngle = (layer as any).getStartAngle();
            const stopAngle = (layer as any).getStopAngle();

            const points: [number, number][] = [];
            const numPoints = 64;

            points.push([circleCenter.lng, circleCenter.lat]);

            for (let i = 0; i <= numPoints; i++) {
              const angle = startAngle + ((stopAngle - startAngle + 360) % 360) * i / numPoints;
              const rad = (angle * Math.PI) / 180;
              const dx = circleRadius * Math.cos(rad);
              const dy = circleRadius * Math.sin(rad);
              const latOffset = (dy / 111319.9);
              const lngOffset = (dx / (111319.9 * Math.cos(circleCenter.lat * Math.PI / 180)));
              points.push([
                circleCenter.lng + lngOffset,
                circleCenter.lat + latOffset
              ]);
            }

            points.push([circleCenter.lng, circleCenter.lat]);

            feature = polygon([points]) as unknown as Feature<GeoJSONPolygon, GeoJsonProperties>;
            const geoJsonArea = area(feature);
            const propertyArea = (layer as any).properties?.surface || 0;

            console.log('\nConversion Semicircle -> GeoJSON');
            console.log(`- Rayon: ${circleRadius.toFixed(2)}m`);
            console.log(`- Surface propriété: ${propertyArea.toFixed(2)}m²`);
            console.log(`- Surface GeoJSON: ${geoJsonArea.toFixed(2)}m²`);
            console.log(`- Différence: ${Math.abs(propertyArea - geoJsonArea).toFixed(2)}m² (${((Math.abs(propertyArea - geoJsonArea) / propertyArea) * 100).toFixed(2)}%)`);

            return feature;
          }
          return null;
        } catch (error) {
          console.error('[useMapDrawing] Erreur lors de la conversion en GeoJSON:', error);
          return null;
        }
      }).filter((f): f is Feature<GeoJSONPolygon, GeoJsonProperties> => f !== null);

      if (features.length === 0) return 0;

      // Calculer la surface totale du groupe
      const individualAreas = features.map(feature => {
        const featureArea = area(feature);
        console.log(`Surface individuelle: ${featureArea.toFixed(2)}m²`);
        return featureArea;
      });

      let intersectionArea = 0;
      for (let i = 0; i < features.length; i++) {
        for (let j = i + 1; j < features.length; j++) {
          try {
            const collection = featureCollection([features[i], features[j]]) as FeatureCollection<GeoJSONPolygon, GeoJsonProperties>;
            const intersectionResult = intersect(collection);

            if (intersectionResult) {
              const overlapArea = area(intersectionResult);
              intersectionArea += overlapArea;
              console.log(`Intersection entre formes ${i + 1} et ${j + 1}: ${overlapArea.toFixed(2)}m²`);
            }
          } catch (error) {
            console.error(`Erreur lors du calcul d'intersection entre les formes ${i + 1} et ${j + 1}:`, error);
          }
        }
      }

      const totalArea = individualAreas.reduce((sum, area) => sum + area, 0);
      const groupArea = totalArea - intersectionArea;

      console.log(`\nCalcul de la surface d'irrigation pour le groupe ${groupIndex + 1}:`);
      console.log(`- Surface totale (somme): ${totalArea.toFixed(2)}m²`);
      console.log(`- Surface d'intersection: ${intersectionArea.toFixed(2)}m²`);
      console.log(`- Surface d'irrigation finale: ${groupArea.toFixed(2)}m²`);

      return groupArea;
    });

    // Retourner la surface du groupe sélectionné ou la plus grande surface si aucun groupe n'est sélectionné
    const maxArea = Math.max(...groupAreas);
    console.log(`\nSurface d'irrigation maximale parmi les groupes: ${maxArea.toFixed(2)}m²`);
    return maxArea;
  };
  // Fonction pour cacher la visualisation
  const hideCoverageOverlay = () => {
    if (coverageOverlayGroup.value) {
      map.value.removeLayer(coverageOverlayGroup.value);
      coverageOverlayGroup.value = null;
    }
  };

  // Fonction pour afficher la visualisation de la couverture
  const showCoverageOverlay = (layers: L.Layer[], targetLayer?: L.Layer) => {
    if (!map.value) return;

    // Hide existing overlay first
    hideCoverageOverlay();

    // If targetLayer is provided, only show coverage for connected shapes
    const shapesToShow = targetLayer ?
      getConnectedShapes(layers, targetLayer) :
      layers;

    // Create the overlay group if it doesn't exist
    if (!coverageOverlayGroup.value) {
      coverageOverlayGroup.value = L.layerGroup().addTo(map.value);
    }

    // Create and add each coverage overlay
    shapesToShow.forEach(layer => {
      const type = (layer as any).properties?.type;

      if (type === 'Circle' || type === 'Semicircle') {
        const center = (layer as any).getLatLng();
        const radius = (layer as any).getRadius();

        // Add a circle with dashed outline for better visual indication
        const circleOverlay = L.circle(center, {
          radius: radius,
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          stroke: true,
          color: '#3B82F6',
          weight: 1,
          opacity: 0.8,
          dashArray: '5, 5',
          interactive: false,
          renderer: L.canvas({ padding: 0.5 })
        });

        // Add another circle for the filled pattern
        const patternCircle = L.circle(center, {
          radius: radius,
          fillColor: '#3B82F6',
          fillOpacity: 0.05,
          stroke: false,
          interactive: false,
          renderer: L.canvas({ padding: 0.5 })
        });

        if (coverageOverlayGroup.value) {
          coverageOverlayGroup.value.addLayer(patternCircle);
          coverageOverlayGroup.value.addLayer(circleOverlay);
        }

      } else if (type === 'Rectangle' || type === 'Polygon') {
        const latLngs = (layer as any).getLatLngs();

        // Add polygon with dashed outline
        const polygonOverlay = L.polygon(latLngs, {
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          stroke: true,
          color: '#3B82F6',
          weight: 1,
          opacity: 0.8,
          dashArray: '5, 5',
          interactive: false,
          renderer: L.canvas({ padding: 0.5 })
        });

        // Add another polygon for the filled pattern
        const patternPolygon = L.polygon(latLngs, {
          fillColor: '#3B82F6',
          fillOpacity: 0.05,
          stroke: false,
          interactive: false,
          renderer: L.canvas({ padding: 0.5 })
        });

        if (coverageOverlayGroup.value) {
          coverageOverlayGroup.value.addLayer(patternPolygon);
          coverageOverlayGroup.value.addLayer(polygonOverlay);
        }
      }
    });

    // Add a label to indicate this is a connected group
    if (targetLayer && shapesToShow.length > 1 && map.value) {
      // Get bounds of all shapes in the group
      const bounds = L.latLngBounds([]);

      shapesToShow.forEach(layer => {
        if ((layer as any).getBounds) {
          bounds.extend((layer as any).getBounds());
        } else if ((layer as any).getLatLng) {
          bounds.extend((layer as any).getLatLng());
        }
      });

      // Add a tooltip at the center of the bounds
      const center = bounds.getCenter();
      const tooltip = L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'connected-group-tooltip'
      })
        .setContent('<div>Groupe connecté</div>')
        .setLatLng(center);

      if (coverageOverlayGroup.value) {
        coverageOverlayGroup.value.addLayer(L.marker(center, {
          opacity: 0,
          interactive: false
        }).bindTooltip(tooltip).openTooltip());
      }
    }
  };

  // Function to find all shapes connected to a given shape (directly or indirectly)
  const getConnectedShapes = (layers: L.Layer[], startLayer: L.Layer): L.Layer[] => {
    if (!startLayer) return [];

    // Set to keep track of visited layers
    const visited = new Set<number>();
    // Queue for breadth-first search
    const queue: L.Layer[] = [startLayer];
    // Result array of connected layers
    const connectedLayers: L.Layer[] = [startLayer];

    // Add initial layer to visited set
    if ((startLayer as any)._leaflet_id !== undefined) {
      visited.add((startLayer as any)._leaflet_id);
    }

    while (queue.length > 0) {
      const currentLayer = queue.shift()!;

      // Check if this layer intersects with any other layers
      for (const layer of layers) {
        // Skip if it's the same layer or already visited
        if (
          layer === currentLayer ||
          visited.has((layer as any)._leaflet_id)
        ) {
          continue;
        }

        // Check if layers intersect
        const intersects = doLayersIntersect(currentLayer, layer);

        if (intersects) {
          // Add to results and queue for further processing
          connectedLayers.push(layer);
          queue.push(layer);
          visited.add((layer as any)._leaflet_id);
        }
      }
    }

    return connectedLayers;
  };

  // Helper function to check if two layers intersect
  const doLayersIntersect = (layer1: L.Layer, layer2: L.Layer): boolean => {
    // Get bounds for both layers
    let bounds1: L.LatLngBounds | null = null;
    let bounds2: L.LatLngBounds | null = null;

    // Handle Circle
    if ((layer1 as any).getBounds && typeof (layer1 as any).getBounds === 'function') {
      bounds1 = (layer1 as any).getBounds();
    } else if ((layer1 as any).getLatLng && (layer1 as any).getRadius) {
      const center = (layer1 as any).getLatLng();
      const radius = (layer1 as any).getRadius();
      bounds1 = L.latLngBounds(
        [center.lat - radius / 111000, center.lng - radius / (111000 * Math.cos(center.lat * Math.PI / 180))],
        [center.lat + radius / 111000, center.lng + radius / (111000 * Math.cos(center.lat * Math.PI / 180))]
      );
    }

    if ((layer2 as any).getBounds && typeof (layer2 as any).getBounds === 'function') {
      bounds2 = (layer2 as any).getBounds();
    } else if ((layer2 as any).getLatLng && (layer2 as any).getRadius) {
      const center = (layer2 as any).getLatLng();
      const radius = (layer2 as any).getRadius();
      bounds2 = L.latLngBounds(
        [center.lat - radius / 111000, center.lng - radius / (111000 * Math.cos(center.lat * Math.PI / 180))],
        [center.lat + radius / 111000, center.lng + radius / (111000 * Math.cos(center.lat * Math.PI / 180))]
      );
    }

    // Return false if bounds couldn't be computed for either layer
    if (!bounds1 || !bounds2) return false;

    // Check if bounding boxes intersect
    if (!bounds1.intersects(bounds2)) return false;

    // For more complex shapes, we could perform more detailed intersection checks here
    // But for simple case, bounding box intersection is a good approximation
    return true;
  };

  // Function to calculate the total coverage area of connected shapes
  const calculateConnectedCoverageArea = (layers: L.Layer[], startLayer: L.Layer): number => {
    const connectedLayers = getConnectedShapes(layers, startLayer);

    // Si la forme n'est connectée à aucune autre (seulement elle-même dans connectedLayers)
    if (connectedLayers.length === 1) {
      // Pour un rectangle seul, retourner sa propre surface
      if ((startLayer as any).properties?.surface) {
        return (startLayer as any).properties.surface;
      }
    }

    return calculateTotalCoverageArea(connectedLayers);
  };

  // Gestionnaire d'événements par défaut pour pm:create
  const defaultCreateHandler = (e: any) => {
    const layer = e.layer;
    featureGroup.value?.addLayer(layer);

    // Déterminer le type de forme
    let shapeType = 'unknown';
    if (layer instanceof L.Circle) {
      shapeType = currentTool.value === 'Semicircle' ? 'Semicircle' : 'Circle';
    } else if (layer instanceof L.Rectangle) {
      shapeType = 'Rectangle';
    } else if (layer instanceof L.Polygon) {
      shapeType = 'Polygon';
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      shapeType = 'Line';
    }

    // Calculer et initialiser les propriétés
    layer.properties = calculateShapeProperties(layer, shapeType);

    // Ajouter des propriétés pour le filtrage
    if (!layer.properties) {
      layer.properties = {};
    }
    if (!layer.properties.category) {
      // Utiliser 'forages' comme catégorie par défaut pour assurer la compatibilité avec les filtres
      layer.properties.category = 'forages';
    }
    if (!layer.properties.accessLevel) {
      layer.properties.accessLevel = 'visitor';
    }

    // Assigner un ID temporaire pour le filtrage
    layer._dbId = Date.now() + Math.floor(Math.random() * 1000);

    selectedShape.value = layer;

    console.log('[useMapDrawing] Input layer:', {
      type: shapeType,
      instanceof: {
        Circle: layer instanceof L.Circle,
        Rectangle: layer instanceof L.Rectangle,
        Polygon: layer instanceof L.Polygon,
        Polyline: layer instanceof L.Polyline
      },
      options: layer.options,
      properties: layer.properties,
      _dbId: layer._dbId
    });

    // Émettre un événement pour notifier la création
    window.dispatchEvent(new CustomEvent('shape:created', {
      detail: {
        shape: layer,
        type: shapeType,
        properties: layer.properties
      }
    }));

    // Ajouter les événements de survol
    layer.on('mouseover', () => {
      console.log('[mouseover] Survol de la forme', {
        type: shapeType,
        isSelected: selectedShape.value === layer
      });
      if (!selectedShape.value || selectedShape.value !== layer) {
        generateTempControlPoints(layer);
      }
    });

    layer.on('mouseout', () => {
      console.log('[mouseout] Sortie de la forme', {
        type: shapeType,
        isSelected: selectedShape.value === layer
      });
      if (!selectedShape.value || selectedShape.value !== layer) {
        tempControlPointsGroup.value?.clearLayers();
      }
    });

    // Ajouter les points de contrôle selon le type
    if (shapeType === 'Semicircle') {
      // Semicircle supprimé selon les exigences
      console.log('Conversion en demi-cercle désactivée selon les exigences');
    } else if (shapeType === 'Circle') {
      // Supprimer le cercle standard de Leaflet
      featureGroup.value?.removeLayer(layer);
      // Créer notre cercle personnalisé
      const circle = new Circle(layer.getLatLng(), {
        radius: layer.getRadius(),
        ...layer.options
      });

      // S'assurer que les propriétés sont bien définies avec un type explicite
      circle.properties = {
        ...calculateShapeProperties(circle, 'Circle'),
        type: 'Circle'
      };

      // S'assurer que l'attribut name existe et est défini comme une propriété énumérable
      Object.defineProperty(circle, 'name', {
        value: circle.properties.name,
        writable: true,
        enumerable: true,
        configurable: true
      });

      console.log('[useMapDrawing] Création du cercle personnalisé:', {
        propertyDescriptor: Object.getOwnPropertyDescriptor(circle, 'name'),
        directName: (circle as any).name,
        propertiesName: circle.properties.name,
        nameIsEnumerable: Object.keys(circle).includes('name'),
        allProperties: Object.keys(circle.properties),
        allKeys: Object.keys(circle)
      });

      featureGroup.value?.addLayer(circle);
      selectedShape.value = circle;
      updateCircleControlPoints(circle);
    } else if (shapeType === 'Rectangle') {
      // Supprimer le rectangle standard de Leaflet
      featureGroup.value?.removeLayer(layer);
      // Créer notre rectangle personnalisé
      const rectangle = new Rectangle(layer.getBounds(), {
        ...layer.options,
      });
      rectangle.updateProperties();
      featureGroup.value?.addLayer(rectangle);
      selectedShape.value = rectangle;
      updateRectangleControlPoints(rectangle);
    } else if (layer instanceof L.Polygon) {
      // Convertir en notre Polygon personnalisé
      const latLngs = layer.getLatLngs()[0] as L.LatLngExpression[];
      const polygon = new Polygon([latLngs], {
        ...layer.options
      });
      polygon.updateProperties();
      featureGroup.value?.removeLayer(layer);
      featureGroup.value?.addLayer(polygon);
      selectedShape.value = polygon;
      updatePolygonControlPoints(polygon);
    } else if (layer instanceof Line) {
      updateLineControlPoints(layer);
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      // Pour la compatibilité avec les polylines standard de Leaflet
      // Convertir en notre Line personnalisée
      const latLngs = layer.getLatLngs() as L.LatLngExpression[];
      const line = new Line(latLngs, {
        ...layer.options
      });
      line.updateProperties();
      featureGroup.value?.removeLayer(layer);
      featureGroup.value?.addLayer(line);
      selectedShape.value = line;
      updateLineControlPoints(line);
    }

    // Afficher le message d'aide
    showHelpMessage('Cliquez sur la forme pour afficher les points de contrôle');
  };

  // Fonction pour restaurer le gestionnaire d'événements par défaut
  const restoreDefaultCreateHandler = () => {
    if (map.value) {
      map.value.off('pm:create');
      map.value.on('pm:create', defaultCreateHandler);
    }
  };

  return {
    map,
    featureGroup,
    controlPointsGroup,
    tempControlPointsGroup,
    currentTool,
    selectedShape,
    isDrawing,
    initMap,
    setDrawingTool,
    updateShapeStyle,
    updateShapeProperties,
    updateTextFixedSize,
    adjustView,
    clearActiveControlPoints,
    calculateTotalCoverageArea,
    showCoverageOverlay,
    hideCoverageOverlay,
    calculateConnectedCoverageArea,
    getConnectedShapes,
  };
}