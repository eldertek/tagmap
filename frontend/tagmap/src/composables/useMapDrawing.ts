import { ref, onUnmounted, nextTick } from 'vue';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet-geometryutil';
import 'leaflet-almostover';
import { Line } from '../utils/Line';
import { Polygon } from '../utils/Polygon';
import { GeoNote } from '../utils/GeoNote';
import { polygon, lineString } from '@turf/helpers';
import area from '@turf/area';
import length from '@turf/length';
import centroid from '@turf/centroid';
import { useDrawingStore } from '../stores/drawing';
import type { 
  AlmostOverEvent, 
  ExtendedGlobalOptions,
  ControlPoint,
  MapRef,
  FeatureGroupRef,
  LayerRef,
  MapDrawingReturn
} from '../types/drawing';

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
  const map = ref<L.Map | null>(null) as MapRef;
  const featureGroup = ref<L.FeatureGroup | null>(null) as FeatureGroupRef;
  const controlPointsGroup = ref<L.FeatureGroup | null>(null) as FeatureGroupRef;
  const tempControlPointsGroup = ref<L.FeatureGroup | null>(null) as FeatureGroupRef;
  const currentTool = ref<string>('');
  const selectedShape = ref<L.Layer | null>(null) as LayerRef;
  const isDrawing = ref<boolean>(false);
  // Ajouter une référence typée pour la couche de visualisation
  const coverageOverlayGroup = ref<L.LayerGroup | null>(null);

  // Gestionnaire d'événement référencé pour pouvoir le supprimer correctement
  const clearControlPointsHandler = () => {
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
  };
  
  // Ajouter l'écouteur d'événement avec la référence à la fonction
  window.addEventListener('clearControlPoints', clearControlPointsHandler);
  
  // Nettoyer l'écouteur lors du démontage
  onUnmounted(() => {
    window.removeEventListener('clearControlPoints', clearControlPointsHandler);
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  });
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
  };
  // Fonction pour créer un point de contrôle
  const createControlPoint = (position: L.LatLng, color: string = '#2563EB'): L.CircleMarker => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const point = L.circleMarker(position, {
      radius: isMobile ? 14 : 6, // Larger on mobile
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
    const properties: any = {
      type,
      style: layer.options || {}
    };
    try {
      // Gestion des types de formes existants
      if (layer instanceof L.Polygon) {
        // Propriétés pour les polygones
        try {
          const latLngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
          const coordinates = latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
          coordinates.push(coordinates[0]); // Fermer le polygone
          const polygonFeature = polygon([coordinates]);
          properties.surface = area(polygonFeature);
          properties.perimeter = length(lineString(coordinates), { units: 'meters' });
        } catch (e) {
          console.warn('Erreur lors du calcul des propriétés du polygone:', e);
          // Valeurs par défaut en cas d'erreur
          properties.surface = 0;
          properties.perimeter = 0;
        }
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // Propriétés pour les lignes
        try {
          const latLngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
          let lineLength = 0;
          for (let i = 1; i < latLngs.length; i++) {
            lineLength += latLngs[i].distanceTo(latLngs[i - 1]);
          }
          properties.length = lineLength;
        } catch (e) {
          console.warn('Erreur lors du calcul de la longueur de la ligne:', e);
          // Valeur par défaut en cas d'erreur
          properties.length = 0;
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
      console.error('Erreur lors du calcul des propriétés de la forme:', error);
      // Assurer que l'objet properties contient au moins le style de base
      properties.style = properties.style || {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        dashArray: ''
      };
    }
    return properties;
  };
  // Fonction pour ajouter les lignes existantes à almostOver
  const addLinesToAlmostOver = () => {
    if (!map.value || !map.value.almostOver || !featureGroup.value) {
      return;
    }
    
    // Récupérer toutes les lignes existantes
    const lines = featureGroup.value.getLayers().filter((layer: L.Layer) => 
      layer instanceof Line || 
      (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) ||
      layer instanceof Polygon ||
      layer instanceof GeoNote
    );
    
    // Ajouter chaque ligne au almostOver
    lines.forEach((line: L.Layer) => {
      map.value?.almostOver.addLayer(line);
    });
  };

  const initMap = (element: HTMLElement, center: L.LatLngExpression, zoom: number): L.Map => {
    // Créer les options étendues de la carte qui incluent nos options personnalisées
    // Utiliser une assertion de type pour éviter l'erreur TypeScript
    const mapOptions = {
      almostOnMouseMove: true, // Enable almostOver for mousemove events
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    } as any; // Assertion de type pour éviter l'erreur TypeScript
    
    const mapInstance = L.map(element, mapOptions).setView(center, zoom);
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
    
    // Initialize almostOver with a tolerance of 25 pixels
    if (!mapInstance.almostOver) {
      console.warn('Leaflet.AlmostOver plugin not loaded properly');
    } else {
      // Set the click tolerance in pixels
      mapInstance.almostOver.options.tolerance = 25;
    }
    
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
    
    // Ajouter les lignes existantes à almostOver
    // Attendre que la carte soit prête avant d'ajouter les lignes
    mapInstance.whenReady(() => {
      // Vérifier si la carte est toujours disponible avant d'ajouter les lignes
      if (map.value && map.value.almostOver && featureGroup.value) {
        // Donner du temps pour que les couches soient chargées
        setTimeout(addLinesToAlmostOver, 100);
      }
    });

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

      // Reste du code...
      tempControlPointsGroup.value?.clearLayers();
      clearActiveControlPoints();
      selectedShape.value = clickedLayer;

      if (clickedLayer instanceof L.Polygon) {
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
      const layer = e.layer;
      if (layer) {
        const shapeType = layer.properties?.type || 'unknown';
        updateLayerProperties(layer, shapeType);
        // Mise à jour des points de contrôle
        if (layer instanceof L.Polygon) {
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
      const layer = e.layer;
      if (layer) {
        const shapeType = layer.properties?.type || 'unknown';
        if (layer instanceof Line) {
          // Si c'est notre Line personnalisée, s'assurer de mettre à jour ses propriétés
          layer.updateProperties();
          updateLayerProperties(layer, 'Line');
          // Mettre à jour les points de contrôle
          updateLineControlPoints(layer);
        } else {
          updateLayerProperties(layer, shapeType);
        }
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
    
    // Setup AlmostOver event listeners
    mapInstance.on('almost:over', (function(e: L.LeafletEvent) {
      // Assertion de type pour éviter l'erreur TypeScript
      const almostEvent = e as unknown as AlmostOverEvent;
      const layer = almostEvent.layer;
      
      // Enlever la condition !selectedShape.value pour permettre le survol même avec une forme sélectionnée
      if (layer) {
        // Si la forme est déjà sélectionnée, ne pas appliquer l'effet de survol
        if (selectedShape.value === layer) {
          return;
        }
        
        // Highlight the line when the mouse is almost over it
        if (layer instanceof Line) {
          const originalStyle = { ...layer.options };
          layer._originalStyle = originalStyle;
          layer.setStyle({ 
            weight: (originalStyle.weight || 3) + 2,
            opacity: Math.min((originalStyle.opacity || 1) + 0.2, 1)
          });
          
          // Afficher un message d'aide indiquant que l'utilisateur peut cliquer pour sélectionner la ligne
          document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
          showHelpMessage('Cliquez pour sélectionner cette ligne');
          
          // Changer le curseur en pointeur pour indiquer que l'élément est cliquable
          if (mapInstance.getContainer()) {
            mapInstance.getContainer().style.cursor = 'pointer';
          }
        } 
        // Support pour les polygones
        else if (layer instanceof Polygon) {
          const originalStyle = { ...layer.options };
          (layer as any)._originalStyle = originalStyle;
          layer.setStyle({ 
            weight: (originalStyle.weight || 3) + 2,
            opacity: Math.min((originalStyle.opacity || 1) + 0.2, 1),
            fillOpacity: Math.min((originalStyle.fillOpacity || 0.2) + 0.1, 0.4)
          });
          
          document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
          showHelpMessage('Cliquez pour sélectionner ce polygone');
          
          if (mapInstance.getContainer()) {
            mapInstance.getContainer().style.cursor = 'pointer';
          }
        }
        // Support pour les notes géolocalisées
        else if (layer instanceof GeoNote) {
          const element = layer.getElement();
          if (element) {
            // Ajouter la classe pour l'effet de pulsation
            element.classList.add('geo-note-pulse');
            
            // Augmenter le z-index pour placer au-dessus des autres éléments
            element.style.zIndex = '1000';
            
            // S'assurer que l'élément est visible
            element.style.visibility = 'visible';
            element.style.display = 'flex';
            element.style.opacity = '1';
            
            // Utiliser un filtre explicite (pas d'animation dans le style inline)
            element.style.filter = 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.7))';
          }
          
          document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
          showHelpMessage('Cliquez pour sélectionner cette note');
          
          if (mapInstance.getContainer()) {
            mapInstance.getContainer().style.cursor = 'pointer';
          }
        }
      }
    }) as L.LeafletEventHandlerFn);
    
    mapInstance.on('almost:out', (function(e: L.LeafletEvent) {
      // Assertion de type pour éviter l'erreur TypeScript
      const almostEvent = e as unknown as AlmostOverEvent;
      const layer = almostEvent.layer;
      
      // Enlever la condition !selectedShape.value pour permettre le survol même avec une forme sélectionnée
      if (layer) {
        // Si la forme est déjà sélectionnée, ne pas réinitialiser son style
        if (selectedShape.value === layer) {
          return;
        }
        
        // Restore original style when mouse moves away
        if (layer instanceof Line && layer._originalStyle) {
          layer.setStyle(layer._originalStyle);
          layer._originalStyle = undefined;
        }
        // Support pour les polygones
        else if (layer instanceof Polygon) {
          if ((layer as any)._originalStyle) {
            layer.setStyle((layer as any)._originalStyle);
            (layer as any)._originalStyle = undefined;
          }
        }
        // Support pour les notes géolocalisées
        else if (layer instanceof GeoNote) {
          const element = layer.getElement();
          if (element) {
            
            // Retirer la classe de pulsation
            element.classList.remove('geo-note-pulse');
            
            // Réinitialiser le z-index
            element.style.zIndex = '';
            
            // Réinitialiser le filtre sans le supprimer complètement
            element.style.filter = 'none';
            
            // S'assurer que l'opacité est maintenue à 1
            element.style.opacity = '1';
            
            // Forcer un rafraîchissement de l'affichage
            element.style.display = 'block';
            element.style.visibility = 'visible';
            
            // S'assurer que tous les descendants sont également visibles
            Array.from(element.querySelectorAll('*')).forEach(el => {
              (el as HTMLElement).style.visibility = 'visible';
              (el as HTMLElement).style.display = 'block';
              (el as HTMLElement).style.opacity = '1';
            });
            
            // Utiliser recreateIcon en dernier recours, uniquement si après un délai court l'élément est toujours invisible
            setTimeout(() => {
              try {
                const boundingRect = element.getBoundingClientRect();
                if (boundingRect.width === 0 || boundingRect.height === 0) {
                  console.warn('[almost:out] L\'élément a une taille nulle après sortie, recréation de l\'icône');
                  layer.recreateIcon();
                }
              } catch (error) {
                console.error('[almost:out] Erreur lors de la vérification de la taille:', error);
                layer.recreateIcon();
              }
            }, 100);
          } else {
            // Si l'élément est introuvable, recréer l'icône
            console.warn('[almost:out] Élément DOM introuvable, recréation de l\'icône');
            layer.recreateIcon();
          }
        }
        
        // Supprimer le message d'aide uniquement si ce n'est pas lié à la forme sélectionnée
        // (ainsi le message d'aide pour la forme sélectionnée reste affiché)
        if (!selectedShape.value || 
            (selectedShape.value && selectedShape.value !== layer)) {
          document.querySelectorAll('.drawing-help-message').forEach(msg => msg.remove());
        }
        
        // Restaurer le curseur par défaut seulement si aucune forme n'est survollée
        if (mapInstance.getContainer() && 
            (!document.querySelectorAll('.geo-note-pulse').length && 
             !document.querySelectorAll('.line-hover-effect').length)) {
          mapInstance.getContainer().style.cursor = '';
        }
      }
    }) as L.LeafletEventHandlerFn);
    
    mapInstance.on('almost:click', (function(e: L.LeafletEvent) {
      // Assertion de type pour éviter l'erreur TypeScript
      const almostEvent = e as unknown as AlmostOverEvent;
      
      const layer = almostEvent.layer;
      
      // Si la forme cliquée est déjà sélectionnée, ne rien faire
      if (layer && selectedShape.value === layer) {
        return;
      }
      
      // Si une forme est déjà sélectionnée, nettoyer les points de contrôle existants
      if (selectedShape.value) {
        clearActiveControlPoints();
      }
      
      // Gestion des lignes
      if (layer && layer instanceof Line) {
        // Sélectionner la ligne
        selectedShape.value = layer;
        
        // Nettoyer les points de contrôle actuels
        tempControlPointsGroup.value?.clearLayers();
        clearActiveControlPoints();
        
        // Mettre à jour les points de contrôle de la ligne
        updateLineControlPoints(layer);
        
        // Afficher le message d'aide
        showHelpMessage('Utilisez les points de contrôle pour modifier la ligne');
      }
      // Gestion des polygones
      else if (layer && layer instanceof Polygon) {
        // Sélectionner le polygone
        selectedShape.value = layer;
        
        // Nettoyer les points de contrôle actuels
        tempControlPointsGroup.value?.clearLayers();
        clearActiveControlPoints();
        
        // Mettre à jour les points de contrôle du polygone
        updatePolygonControlPoints(layer);
        
        // Afficher le message d'aide
        showHelpMessage('Utilisez les points de contrôle pour modifier le polygone');
      }
      // Gestion des notes géolocalisées
      else if (layer && layer instanceof GeoNote) {
        // Sélectionner la note
        selectedShape.value = layer;

        // Ouvrir la note pour édition
        layer.editNote();
      }
    }) as L.LeafletEventHandlerFn);
    
    // Pour les événements layeradd et layerremove, utilisez le type correct
    fg.on('layeradd', function(e: L.LayerEvent) {
      if (mapInstance.almostOver && (
        e.layer instanceof Line || 
        (e.layer instanceof L.Polyline && !(e.layer instanceof L.Polygon)) ||
        e.layer instanceof Polygon ||
        e.layer instanceof GeoNote
      )) {
        mapInstance.almostOver.addLayer(e.layer);
      }
    });
    
    fg.on('layerremove', function(e: L.LayerEvent) {
      if (mapInstance.almostOver && (
        e.layer instanceof Line || 
        (e.layer instanceof L.Polyline && !(e.layer instanceof L.Polygon)) ||
        e.layer instanceof Polygon ||
        e.layer instanceof GeoNote
      )) {
        mapInstance.almostOver.removeLayer(e.layer);
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
            if (map.value) {
              map.value.options.fadeAnimation = originalAnimationState.fadeAnimation;
            }

            // Puis après un délai supplémentaire, restaurer les autres animations
            setTimeout(() => {
              try {
                if (map.value) {
                  map.value.options.zoomAnimation = originalAnimationState.zoomAnimation;
                  map.value.options.markerZoomAnimation = originalAnimationState.markerZoomAnimation;
                }
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

    // Émettre un événement pour indiquer que l'outil a changé
    // Cela permettra de nettoyer les gestionnaires d'événements spécifiques à l'outil
    window.dispatchEvent(new CustomEvent('tool:changed', {
      detail: {
        previousTool: currentTool.value,
        newTool: tool
      }
    }));

    currentTool.value = tool;
    // Si aucun outil n'est sélectionné
    if (!tool) {
      clearActiveControlPoints();
      // Réactualiser almostOver après changement d'outil
      addLinesToAlmostOver();
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
          case 'GeoNote':
            showHelpMessage('Cliquez pour ajouter une note géolocalisée, double-cliquez pour éditer');
            if (map.value) {
              // Fonction pour créer une note géolocalisée à une position donnée
              const createGeoNote = async (latlng: L.LatLng) => {
                if (!map.value || !featureGroup.value) return null;

                try {
                  // Initialiser le store de dessin
                  const drawingStore = useDrawingStore();

                  // Créer une nouvelle note géolocalisée
                  const geoNote = new GeoNote(latlng, {
                    color: '#3B82F6',
                    name: 'Note géolocalisée',
                    description: '',
                    columnId: '1' // Associer automatiquement à la colonne 'Idées'
                  });
                  featureGroup.value.addLayer(geoNote);
                  selectedShape.value = geoNote;

                  // Mettre à jour les propriétés
                  geoNote.updateProperties();

                  // Sauvegarder la note directement via la méthode saveNote
                  try {
                    // Récupérer l'ID du plan courant
                    const planId = drawingStore.currentMapId || undefined;

                    // Sauvegarder la note en l'associant au plan courant
                    const backendId = await geoNote.saveNote(planId);

                    // IMPORTANT: Conserver l'ID Leaflet original pour référence
                    const leafletId = (geoNote as any)._leaflet_id;

                    // Émettre un événement pour informer de la création réussie
                    window.dispatchEvent(new CustomEvent('note:created', {
                      detail: {
                        geoNote,
                        leafletId,
                        backendId
                      }
                    }));

                    // Ouvrir le popup pour édition immédiate
                    geoNote.openPopup();

                    // Retourner la note créée
                    return geoNote;
                  } catch (error) {
                    console.error('[useMapDrawing] Erreur lors de la sauvegarde de la note:', error);
                    // Afficher un message d'erreur
                    import('../stores/notification').then(({ useNotificationStore }) => {
                      const notificationStore = useNotificationStore();
                      notificationStore.error('Erreur lors de la création de la note');
                    });
                    return null;
                  }
                } catch (error) {
                  console.error('[useMapDrawing] Erreur lors de la création de la note:', error);
                  return null;
                }
              };

              const onClick = async (e: L.LeafletMouseEvent) => {
                // Empêcher la propagation de l'événement pour éviter que les formes existantes ne le capturent
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e as unknown as Event);

                // Créer la note à la position du clic
                const geoNote = await createGeoNote(e.latlng);

                if (geoNote && map.value) {
                  // Désactiver le mode note après l'ajout
                  map.value.off('click', onClick);

                  // Nettoyer les gestionnaires d'événements pour les formes existantes
                  if (featureGroup.value) {
                    featureGroup.value.getLayers().forEach((layer: L.Layer) => {
                      if (layer.off && typeof layer.off === 'function') {
                        try {
                          // Essayer de supprimer tous les gestionnaires de clic
                          layer.off('click');
                        } catch (error) {
                          console.warn('[useMapDrawing] Erreur lors du nettoyage des gestionnaires:', error);
                        }
                      }
                    });
                  }

                  // Désactiver l'outil de dessin
                  setDrawingTool('');

                  // Émettre un événement pour sélectionner la note dans l'interface
                  window.dispatchEvent(new CustomEvent('geonote:select', {
                    detail: {
                      geoNote,
                      leafletId: (geoNote as any)._leaflet_id
                    }
                  }));
                }
              };

              // Ajouter un gestionnaire d'événements pour les clics sur la carte
              map.value.on('click', onClick);

              // Ajouter un gestionnaire d'événements pour les clics sur les formes existantes
              if (featureGroup.value) {
                const onShapeClick = async (e: L.LeafletMouseEvent) => {
                  // Empêcher la propagation de l'événement pour éviter que la forme ne soit sélectionnée
                  L.DomEvent.stopPropagation(e);
                  L.DomEvent.preventDefault(e as unknown as Event);

                  // Créer la note à la position du clic sur la forme
                  const geoNote = await createGeoNote(e.latlng);

                  if (geoNote && map.value) {
                    // Désactiver le mode note après l'ajout
                    map.value.off('click', onClick);

                    // Nettoyer les gestionnaires d'événements pour les formes existantes
                    if (featureGroup.value) {
                      featureGroup.value.getLayers().forEach((layer: L.Layer) => {
                        if (layer.off && typeof layer.off === 'function') {
                          try {
                            // Essayer de supprimer tous les gestionnaires de clic
                            layer.off('click');
                          } catch (error) {
                            console.warn('[useMapDrawing] Erreur lors du nettoyage des gestionnaires:', error);
                          }
                        }
                      });
                    }

                    // Désactiver l'outil de dessin
                    setDrawingTool('');

                    // Émettre un événement pour sélectionner la note dans l'interface
                    window.dispatchEvent(new CustomEvent('geonote:select', {
                      detail: {
                        geoNote,
                        leafletId: (geoNote as any)._leaflet_id
                      }
                    }));
                  }

                  return false;
                };

                // Appliquer le gestionnaire à toutes les formes existantes
                featureGroup.value.getLayers().forEach((layer: L.Layer) => {
                  layer.on('click', onShapeClick);
                });

                // Nettoyer les gestionnaires d'événements lorsque l'outil est désactivé
                const cleanupShapeHandlers = () => {
                  if (featureGroup.value) {
                    featureGroup.value.getLayers().forEach((layer: L.Layer) => {
                      if (layer.off && typeof layer.off === 'function') {
                        try {
                          // Essayer de supprimer tous les gestionnaires de clic
                          layer.off('click');
                        } catch (error) {
                          console.warn('[useMapDrawing] Erreur lors du nettoyage des gestionnaires:', error);
                        }
                      }
                    });
                  }
                  window.removeEventListener('tool:changed', cleanupShapeHandlers);
                };

                // Écouter l'événement de changement d'outil pour nettoyer les gestionnaires
                window.addEventListener('tool:changed', cleanupShapeHandlers);
              }
            }
            break;
          case 'delete':
            showHelpMessage('Cliquez sur une forme pour la supprimer');
            map.value?.pm.enableGlobalRemovalMode();
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
    {
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


    // Mettre à jour les propriétés de la forme
    if (!selectedShape.value.properties) {
      selectedShape.value.properties = {};
    }

    // S'assurer que le type est préservé
    const currentType = selectedShape.value.properties.type;

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
    }

    // Sauvegarder le type actuel avant de mettre à jour les propriétés
    const originalType = selectedShape.value.properties.type;

    // Sauvegarder la catégorie existante avant la mise à jour
    const existingCategory = selectedShape.value.properties.category;

    // Vérifier si la catégorie est mise à jour
    const isCategoryUpdated = 'category' in properties && properties.category !== existingCategory;

    // Appliquer les nouvelles propriétés
    Object.keys(properties).forEach(key => {
      // Ne pas écraser le type si la forme en a déjà un
      if (key === 'type' && originalType) {
        // Ne rien faire, on garde le type original
      } else {
        if (selectedShape.value) {
          selectedShape.value.properties[key] = properties[key];
        }
      }

      // Si on met à jour le nom, le stocker directement sur la couche aussi pour double sécurité
      if (key === 'name') {
        (selectedShape.value as any).name = properties[key];
      }
    });

    // S'assurer que le type est toujours préservé après la mise à jour
    if (originalType) {
      selectedShape.value.properties.type = originalType;
    }

    // S'assurer que la catégorie est préservée si elle n'a pas été explicitement mise à jour
    if (existingCategory && !isCategoryUpdated) {
      selectedShape.value.properties.category = existingCategory;
    }

    // Si la forme a un ID de base de données et que la catégorie a été mise à jour,
    // mettre à jour la catégorie dans le store
    if (selectedShape.value && selectedShape.value._dbId && isCategoryUpdated) {
      const drawingStore = useDrawingStore();
      const storeElement = drawingStore.elements.find((e: any) => e.id === selectedShape.value?._dbId);

      if (storeElement) {
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

    // L'événement est déjà émis plus haut dans la fonction
  };
  const forceShapeUpdate = (layer: L.Layer) => {
    // Réassigner directement selectedShape avec une nouvelle référence
    selectedShape.value = null; // Forcer un reset
    nextTick(() => {
      selectedShape.value = layer;
    });
  };
  const updateLayerProperties = (layer: L.Layer, shapeType: string) => {
    // Utiliser debouncedCalculateProperties au lieu de calculateShapeProperties directement
    const debouncedCalculateProperties = debounce((layer: L.Layer, shapeType: string) => {
      const newProperties = calculateShapeProperties(layer, shapeType);
      // Créer une nouvelle référence pour les propriétés
      layer.properties = { ...newProperties };
      // Forcer la mise à jour de la forme sélectionnée
      forceShapeUpdate(layer);
      // Émettre l'événement avec les nouvelles propriétés
      layer.fire('properties:updated', {
        shape: layer,
        properties: layer.properties
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
          const distanceFromStart = layer.getLengthToVertex ? layer.getLengthToVertex(i) : 0;
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
            const distanceFromStart = (layer.getLengthToVertex ? layer.getLengthToVertex(i) : 0) + segmentLength / 2;
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

      // Fonction définie pour le gestionnaire move:start
      const handleMoveStart = () => {
        // Cacher tous les points de contrôle sauf le point central
        activeControlPoints.forEach((point, index) => {
          if (index > 0) {
            point.setStyle({ opacity: 0, fillOpacity: 0 });
            if (point.measureDiv) {
              point.measureDiv.style.display = 'none';
            }
          }
        });
      };

      // Écouter les événements de déplacement avec des références de fonction
      layer.on('move:start', handleMoveStart);
      layer.on('move:end', updateControlPoints);
      layer.on('vertex:moved', updateControlPoints);
      layer.on('latlngs:updated', updateControlPoints);
      layer.on('properties:updated', updateControlPoints);

      // Stocker la fonction de nettoyage avec références correctes
      (activeControlPoints as any).cleanup = () => {
        layer.off('move:start', handleMoveStart);
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


    // Supprimer les points temporaires existants
    tempControlPointsGroup.value.clearLayers();

    try {
      // Traitement selon le type de forme
      if (layer instanceof GeoNote) {
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
          if (tempControlPointsGroup.value) {
            tempControlPointsGroup.value.addLayer(tempCenterPoint);
          }
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
            if (tempControlPointsGroup.value) {
              tempControlPointsGroup.value.addLayer(tempPoint);
            }
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

    } catch (error) {
      console.error('[generateTempControlPoints] Erreur lors de la génération des points temporaires:', error);
    }
  };

  // Gestionnaire d'événements par défaut pour pm:create
  const defaultCreateHandler = (e: any) => {
    const layer = e.layer;
    featureGroup.value?.addLayer(layer);

    // Déterminer le type de forme
    let shapeType = 'unknown';
    if (layer instanceof L.Polygon) {
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
      if (!selectedShape.value || selectedShape.value !== layer) {
        generateTempControlPoints(layer);
      }
    });

    layer.on('mouseout', () => {
      if (!selectedShape.value || selectedShape.value !== layer) {
        tempControlPointsGroup.value?.clearLayers();
      }
    });

    // Ajouter les points de contrôle selon le type
    if (layer instanceof L.Polygon) {
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
      // Ajouter la ligne au almostOver pour la détection améliorée
      if (map.value && map.value.almostOver) {
        map.value.almostOver.addLayer(layer);
      }
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
      
      // Ajouter la ligne au almostOver pour la détection améliorée
      if (map.value && map.value.almostOver) {
        map.value.almostOver.addLayer(line);
      }
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

  // Ajouter une méthode pour activer/désactiver temporairement AlmostOver
  const disableAlmostOver = () => {
    if (map.value && map.value.almostOver) {
      // Sauvegarder la tolérance actuelle
      const currentTolerance = map.value.almostOver.options.tolerance;
      map.value.almostOver.options.tolerance = 0; // Désactiver en mettant à 0
      
      // Retourner une fonction pour réactiver
      return () => {
        if (map.value && map.value.almostOver) {
          map.value.almostOver.options.tolerance = currentTolerance;
        }
      };
    }
    return () => {}; // Fonction vide si almostOver n'est pas disponible
  };
  window.addEventListener('edit:start', () => {
    const restore = disableAlmostOver();
    // Réactiver après l'édition
    const onEditEnd = () => {
      restore();
      window.removeEventListener('edit:end', onEditEnd);
    };
    window.addEventListener('edit:end', onEditEnd);
  });

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
    adjustView,
    clearActiveControlPoints,
    addLinesToAlmostOver
  };
}