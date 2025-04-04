import L from 'leaflet';
import distance from '@turf/distance';
import destination from '@turf/destination';
import { performanceMonitor } from './usePerformanceMonitor';
import { throttle } from 'lodash';

// Interface étendue pour inclure name
interface ExtendedPolylineOptions extends L.PolylineOptions {
  name?: string;
}

/**
 * Classe Rectangle personnalisée qui utilise L.Polygon pour permettre une vraie rotation
 * en utilisant les coordonnées pixels de la carte pour garantir un rectangle visuellement correct
 */
export class Rectangle extends L.Polygon {
  private _width: number;
  private _height: number;
  private _center: L.LatLng;
  private _rotation: number;
  private _isMapReady: boolean = false;
  properties: any;
  
  // Points d'aide pour le positionnement
  private _helperPoints: {
    corners: L.CircleMarker[];
    midPoints: L.CircleMarker[];
  } = { corners: [], midPoints: [] };

  private _throttledUpdateProperties: Function;

  constructor(
    bounds: L.LatLngBoundsExpression,
    options: ExtendedPolylineOptions & { width?: number; height?: number } = {}
  ) {
    // Initialiser avec un polygone vide
    super([], {
      ...options,
      pmIgnore: false,
      interactive: true
    });

    // Convertir bounds en LatLngBounds
    const latLngBounds = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngExpression[]);
    
    // Initialiser les propriétés
    this._center = latLngBounds.getCenter();
    this._rotation = 0;

    console.log('[Rectangle][constructor] Initialisation avec options:', {
      bounds: latLngBounds,
      center: this._center,
      hasExplicitDimensions: !!(options.width && options.height),
      width: options.width,
      height: options.height
    });

    // Si les dimensions sont fournies, les utiliser directement
    if (options.width && options.height) {
      this._width = options.width;
      this._height = options.height;
      console.log('[Rectangle][constructor] Utilisation des dimensions explicites:', {
        width: this._width,
        height: this._height
      });
    } else {
      // Sinon, calculer les dimensions à partir des bounds
      const sw = latLngBounds.getSouthWest();
      const ne = latLngBounds.getNorthEast();
      
      // Calculer les dimensions avec une taille minimale de 1 mètre
      this._width = performanceMonitor.measure('Rectangle.constructor.calculateWidth', () => {
        const width = distance([sw.lng, sw.lat], [ne.lng, sw.lat], { units: 'meters' });
        return Math.max(width, 1); // Taille minimale de 1 mètre
      });
      
      this._height = performanceMonitor.measure('Rectangle.constructor.calculateHeight', () => {
        const height = distance([sw.lng, sw.lat], [sw.lng, ne.lat], { units: 'meters' });
        return Math.max(height, 1); // Taille minimale de 1 mètre
      });

      console.log('[Rectangle][constructor] Dimensions calculées depuis bounds:', {
        width: this._width,
        height: this._height
      });
    }

    // Si les dimensions sont trop petites, ajuster les bounds
    if (this._width < 1 || this._height < 1) {
      const pixelsPerMeter = this._getPixelsPerMeter();
      if (pixelsPerMeter > 0) {
        this._width = Math.max(this._width, 1);
        this._height = Math.max(this._height, 1);
        this._updatePolygonCoordinates(); // Forcer la mise à jour des coordonnées
      }
    }

    // Initialiser les propriétés
    this.properties = performanceMonitor.measure('Rectangle.constructor.initProperties', () => ({
      type: 'Rectangle',
      style: {
        ...options,
        name: options.name || ''
      },
      rotation: this._rotation
    }));

    // Initialiser le throttle pour updateProperties
    this._throttledUpdateProperties = performanceMonitor.measure('Rectangle.constructor.initThrottle', () => {
      return throttle(() => {
        this.updateProperties();
      }, 100); // Throttle à 100ms
    });

    // Écouter les événements
    this.on('add', () => {
      this._isMapReady = true;
      this._updatePolygonCoordinates();
      this.updateProperties();
    });

    this.on('remove', () => {
      this._isMapReady = false;
    });
  }

  /**
   * Met à jour les coordonnées du polygone en fonction des dimensions et de la rotation
   * en utilisant les coordonnées pixels de la carte
   */
  private _updatePolygonCoordinates(): void {
    performanceMonitor.measure('Rectangle._updatePolygonCoordinates', () => {
      if (!this._isMapReady || !this._map) return;

      console.log('[Rectangle][_updatePolygonCoordinates] Début mise à jour avec:', {
        width: this._width,
        height: this._height,
        center: this._center,
        rotation: this._rotation
      });

      // S'assurer que les dimensions ne sont pas inférieures au minimum
      this._width = Math.max(this._width, 1);
      this._height = Math.max(this._height, 1);

      // Calculer les coordonnées des coins en mètres d'abord
      const halfWidth = this._width / 2;
      const halfHeight = this._height / 2;
      
      // Convertir les distances en degrés en utilisant la latitude actuelle
      // Utiliser turf.destination pour calculer les points à partir du centre
      const north = destination(
        [this._center.lng, this._center.lat],
        halfHeight,
        0,
        { units: 'meters' }
      ).geometry.coordinates;
      
      const east = destination(
        [this._center.lng, this._center.lat],
        halfWidth,
        90,
        { units: 'meters' }
      ).geometry.coordinates;
      
      const heightDegrees = Math.abs(north[1] - this._center.lat) * 2;
      const widthDegrees = Math.abs(east[0] - this._center.lng) * 2;
      
      // Calculer les coins non pivotés en coordonnées géographiques
      const unrotatedCorners = [
        L.latLng(this._center.lat + heightDegrees/2, this._center.lng - widthDegrees/2),  // NW
        L.latLng(this._center.lat + heightDegrees/2, this._center.lng + widthDegrees/2),  // NE
        L.latLng(this._center.lat - heightDegrees/2, this._center.lng + widthDegrees/2),  // SE
        L.latLng(this._center.lat - heightDegrees/2, this._center.lng - widthDegrees/2)   // SW
      ];

      // Si pas de rotation, utiliser directement ces coordonnées
      if (this._rotation === 0) {
        this.setLatLngs(unrotatedCorners);
        return;
      }

      // Pour la rotation, convertir en pixels pour une rotation précise
      const centerPoint = this._map.latLngToContainerPoint(this._center);
      const cornersInPixels = unrotatedCorners.map(corner => 
        this._map.latLngToContainerPoint(corner)
      );

      // Appliquer la rotation en pixels
      const rad = (-this._rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const rotatedCorners = cornersInPixels.map(point => {
        const dx = point.x - centerPoint.x;
        const dy = point.y - centerPoint.y;
        return L.point(
          centerPoint.x + (dx * cos - dy * sin),
          centerPoint.y + (dx * sin + dy * cos)
        );
      });

      // Convertir les points pixels en LatLng
      const latLngs = rotatedCorners.map(point => 
        this._map!.containerPointToLatLng(point)
      );

      console.log('[Rectangle][_updatePolygonCoordinates] Résultat final:', {
        corners: latLngs,
        dimensions: { width: this._width, height: this._height }
      });

      // Mettre à jour les coordonnées du polygone
      this.setLatLngs(latLngs);

      // Émettre un événement pour notifier la mise à jour des coordonnées
      this.fire('coordinates:updated', {
        corners: latLngs,
        center: this._center,
        rotation: this._rotation,
        dimensions: { width: this._width, height: this._height }
      });
    });
  }

  /**
   * Calcule le nombre de pixels par mètre à la latitude actuelle et au zoom actuel
   */
  private _getPixelsPerMeter(): number {
    return performanceMonitor.measure('Rectangle._getPixelsPerMeter', () => {
      if (!this._isMapReady || !this._map) return 1;

      // Utiliser une distance adaptative basée sur la largeur actuelle
      // pour éviter les imprécisions dues à une distance fixe
      const adaptiveDistance = Math.max(this._width / 1000, 0.0001);
      
      const centerPoint = this._map.latLngToContainerPoint(this._center);
      const testPoint = this._map.latLngToContainerPoint(
        L.latLng(this._center.lat, this._center.lng + adaptiveDistance)
      );
      
      const pixelDistance = testPoint.x - centerPoint.x;
      const meterDistance = distance(
        [this._center.lng, this._center.lat],
        [this._center.lng + adaptiveDistance, this._center.lat],
        { units: 'meters' }
      );

      // Vérifier que le ratio est valide
      const ratio = Math.abs(pixelDistance / meterDistance);
      if (isNaN(ratio) || ratio <= 0) {
        console.warn('[Rectangle][_getPixelsPerMeter] Ratio invalide, utilisation de la valeur par défaut');
        return 1;
      }

      return ratio;
    });
  }

  /**
   * Obtient les coins du rectangle avec la rotation appliquée
   */
  getRotatedCorners(): L.LatLng[] {
    return performanceMonitor.measure('Rectangle.getRotatedCorners', () => {
      try {
        const latLngs = this.getLatLngs();
        if (!latLngs || !Array.isArray(latLngs) || latLngs.length === 0) {
          // Si pas de coordonnées valides, retourner les coins non pivotés basés sur le centre
          const halfWidth = this._width / 2;
          const halfHeight = this._height / 2;
          return [
            L.latLng(this._center.lat + halfHeight, this._center.lng - halfWidth),  // NW
            L.latLng(this._center.lat + halfHeight, this._center.lng + halfWidth),  // NE
            L.latLng(this._center.lat - halfHeight, this._center.lng + halfWidth),  // SE
            L.latLng(this._center.lat - halfHeight, this._center.lng - halfWidth)   // SW
          ];
        }
        return latLngs[0] as L.LatLng[];
      } catch (error) {
        console.warn('Error in getRotatedCorners:', error);
        // Retourner un rectangle par défaut autour du centre
        const halfWidth = this._width / 2;
        const halfHeight = this._height / 2;
        return [
          L.latLng(this._center.lat + halfHeight, this._center.lng - halfWidth),  // NW
          L.latLng(this._center.lat + halfHeight, this._center.lng + halfWidth),  // NE
          L.latLng(this._center.lat - halfHeight, this._center.lng + halfWidth),  // SE
          L.latLng(this._center.lat - halfHeight, this._center.lng - halfWidth)   // SW
        ];
      }
    });
  }

  /**
   * Calcule les points milieu de chaque côté du rectangle
   */
  getMidPoints(): L.LatLng[] {
    return performanceMonitor.measure('Rectangle.getMidPoints', () => {
      try {
        const corners = this.getRotatedCorners();
        if (!corners || corners.length < 4) {
          // Si pas de coins valides, retourner les points milieux basés sur le centre
          const halfWidth = this._width / 2;
          const halfHeight = this._height / 2;
          return [
            L.latLng(this._center.lat + halfHeight, this._center.lng), // Milieu haut
            L.latLng(this._center.lat, this._center.lng + halfWidth), // Milieu droite
            L.latLng(this._center.lat - halfHeight, this._center.lng), // Milieu bas
            L.latLng(this._center.lat, this._center.lng - halfWidth)  // Milieu gauche
          ];
        }

        // Vérifier que chaque coin a des coordonnées valides
        const validCorners = corners.every(corner => 
          corner && typeof corner.lat === 'number' && typeof corner.lng === 'number'
        );

        if (!validCorners) {
          throw new Error('Invalid corner coordinates');
        }

        return [
          this._getMidPoint(corners[3], corners[0]), // Milieu haut
          this._getMidPoint(corners[0], corners[1]), // Milieu droite
          this._getMidPoint(corners[1], corners[2]), // Milieu bas
          this._getMidPoint(corners[2], corners[3])  // Milieu gauche
        ];
      } catch (error) {
        console.warn('Error in getMidPoints:', error);
        // Retourner des points milieux par défaut
        const halfWidth = this._width / 2;
        const halfHeight = this._height / 2;
        return [
          L.latLng(this._center.lat + halfHeight, this._center.lng), // Milieu haut
          L.latLng(this._center.lat, this._center.lng + halfWidth), // Milieu droite
          L.latLng(this._center.lat - halfHeight, this._center.lng), // Milieu bas
          L.latLng(this._center.lat, this._center.lng - halfWidth)  // Milieu gauche
        ];
      }
    });
  }

  /**
   * Calcule le point milieu entre deux points
   */
  private _getMidPoint(p1: L.LatLng, p2: L.LatLng): L.LatLng {
    return performanceMonitor.measure('Rectangle._getMidPoint', () => {
      if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p1.lng !== 'number' || 
          typeof p2.lat !== 'number' || typeof p2.lng !== 'number') {
        throw new Error('Invalid points for midpoint calculation');
      }
      return L.latLng(
        (p1.lat + p2.lat) / 2,
        (p1.lng + p2.lng) / 2
      );
    });
  }

  /**
   * Obtient le centre du rectangle
   */
  getCenter(): L.LatLng {
    return performanceMonitor.measure('Rectangle.getCenter', () => this._center);
  }

  /**
   * Définit le centre du rectangle
   */
  setCenter(center: L.LatLng): void {
    performanceMonitor.measure('Rectangle.setCenter', () => {
      this._center = center;
      this._updatePolygonCoordinates();
      this.updateProperties();
      
      // Mettre à jour les points d'aide si présents
      this.updateHelperPointPositions();
    });
  }

  /**
   * Obtient l'angle de rotation actuel
   */
  getRotation(): number {
    return performanceMonitor.measure('Rectangle.getRotation', () => this._rotation);
  }

  /**
   * Définit l'angle de rotation
   */
  setRotation(angle: number, updateProperties: boolean = false): void {
    performanceMonitor.measure('Rectangle.setRotation', () => {
      // Normaliser l'angle entre 0 et 360
      this._rotation = ((angle % 360) + 360) % 360;
      
      // Mettre à jour les coordonnées
      this._updatePolygonCoordinates();
      
      // Mettre à jour les propriétés seulement si demandé
      if (updateProperties) {
        this.updateProperties();
      }
      
      // Mettre à jour les points d'aide si présents
      this.updateHelperPointPositions();
      
      // Émettre un événement spécifique pour la rotation
      this.fire('rotation:updated', {
        angle: this._rotation,
        corners: this.getRotatedCorners(),
        center: this._center
      });
    });
  }

  // Ajouter une méthode pour forcer la mise à jour finale
  finalizeRotation(): void {
    performanceMonitor.measure('Rectangle.finalizeRotation', () => {
      // Forcer une mise à jour complète à la fin de la rotation
      this.updateProperties();
    });
  }

  /**
   * Obtient les dimensions du rectangle
   */
  getDimensions(): { width: number; height: number } {
    return performanceMonitor.measure('Rectangle.getDimensions', () => ({
      width: this._width,
      height: this._height
    }));
  }

  /**
   * Définit les dimensions du rectangle
   */
  setDimensions(width: number, height: number): void {
    performanceMonitor.measure('Rectangle.setDimensions', () => {
      console.log('[Rectangle][setDimensions] Début de la mise à jour des dimensions:', {
        oldWidth: this._width,
        oldHeight: this._height,
        newWidth: width,
        newHeight: height
      });

      this._width = width;
      this._height = height;
      
      console.log('[Rectangle][setDimensions] Mise à jour des coordonnées du polygone');
      this._updatePolygonCoordinates();
      
      console.log('[Rectangle][setDimensions] Mise à jour des propriétés');
      this.updateProperties();
      
      // Émettre un événement spécifique pour la mise à jour des dimensions
      console.log('[Rectangle][setDimensions] Émission de l\'événement dimensions:updated');
      this.fire('dimensions:updated', {
        width: this._width,
        height: this._height,
        corners: this.getRotatedCorners(),
        center: this._center
      });
      
      // Mettre à jour les points d'aide si présents
      this.updateHelperPointPositions();
    });
  }

  /**
   * Redimensionne le rectangle depuis un point de contrôle de coin
   */
  resizeFromCorner(cornerIndex: number, newLatLng: L.LatLng): void {
    performanceMonitor.measure('Rectangle.resizeFromCorner', () => {
      if (!this._isMapReady || !this._map) return;

      try {
        // Convertir les points en pixels
        const centerPoint = this._map.latLngToContainerPoint(this._center);
        const newPoint = this._map.latLngToContainerPoint(newLatLng);

        // Calculer le vecteur du centre au nouveau point
        const dx = newPoint.x - centerPoint.x;
        const dy = newPoint.y - centerPoint.y;

        // Calculer l'angle de rotation en radians
        const rad = (-this._rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Rotation inverse du point pour obtenir ses coordonnées dans le repère non pivoté
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;

        // Calculer les nouvelles dimensions en pixels
        const pixelsPerMeter = this._getPixelsPerMeter();
        
        // Déterminer les facteurs de signe en fonction du coin sélectionné
        const signX = cornerIndex === 0 || cornerIndex === 3 ? -1 : 1;
        const signY = cornerIndex === 0 || cornerIndex === 1 ? 1 : -1;

        // Calculer les nouvelles dimensions en préservant les signes
        const newWidth = Math.max(Math.abs(rotatedX * 2) / pixelsPerMeter, 1);
        const newHeight = Math.max(Math.abs(rotatedY * 2) / pixelsPerMeter, 1);

        // Calculer le nouveau centre pour maintenir le coin sélectionné sous la souris
        const halfWidthPx = (newWidth * pixelsPerMeter) / 2;
        const halfHeightPx = (newHeight * pixelsPerMeter) / 2;

        // Calculer le décalage du centre en pixels
        const centerOffsetX = signX * halfWidthPx * cos - signY * halfHeightPx * sin;
        const centerOffsetY = signX * halfWidthPx * sin + signY * halfHeightPx * cos;

        // Calculer la nouvelle position du centre
        const newCenterPoint = L.point(
          newPoint.x - centerOffsetX,
          newPoint.y - centerOffsetY
        );

        // Convertir le nouveau centre en coordonnées géographiques
        const newCenter = this._map.containerPointToLatLng(newCenterPoint);

        // Calculer les coins en pixels (non pivotés)
        const corners = [
          L.point(newCenterPoint.x - halfWidthPx, newCenterPoint.y + halfHeightPx), // SW
          L.point(newCenterPoint.x + halfWidthPx, newCenterPoint.y + halfHeightPx), // SE
          L.point(newCenterPoint.x + halfWidthPx, newCenterPoint.y - halfHeightPx), // NE
          L.point(newCenterPoint.x - halfWidthPx, newCenterPoint.y - halfHeightPx)  // NW
        ];

        // Appliquer la rotation en pixels
        const rotatedCorners = corners.map(point => {
          const dx = point.x - newCenterPoint.x;
          const dy = point.y - newCenterPoint.y;
          return L.point(
            newCenterPoint.x + (dx * cos - dy * sin),
            newCenterPoint.y + (dx * sin + dy * cos)
          );
        });

        // Convertir les points pixels en LatLng
        const latLngs = rotatedCorners.map(point => 
          this._map.containerPointToLatLng(point)
        );

        // Mettre à jour les dimensions et le centre
        this._width = newWidth;
        this._height = newHeight;
        this._center = newCenter;

        // Mettre à jour directement les coordonnées du polygone sans passer par _updatePolygonCoordinates
        this.setLatLngs(latLngs);

        // Émettre un événement pour notifier la mise à jour des coordonnées
        this.fire('coordinates:updated', {
          corners: latLngs,
          center: this._center,
          rotation: this._rotation
        });

      } catch (error) {
        console.warn('Error in resizeFromCorner:', error);
      }
    });
  }

  /**
   * Redimensionne le rectangle depuis un point de contrôle de côté
   */
  resizeFromSide(sideIndex: number, newLatLng: L.LatLng): void {
    performanceMonitor.measure('Rectangle.resizeFromSide', () => {
      if (!this._isMapReady || !this._map) return;

      // Convertir les points en pixels
      const centerPoint = this._map.latLngToContainerPoint(this._center);
      const newPoint = this._map.latLngToContainerPoint(newLatLng);

      // Calculer le vecteur du centre au nouveau point
      const dx = newPoint.x - centerPoint.x;
      const dy = newPoint.y - centerPoint.y;

      // Appliquer la rotation inverse
      const rad = (-this._rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      // Calculer les nouvelles dimensions en pixels
      const pixelsPerMeter = this._getPixelsPerMeter();
      if (sideIndex % 2 === 0) { // Côtés haut/bas
        this._height = Math.abs(rotatedY * 2) / pixelsPerMeter;
      } else { // Côtés gauche/droite
        this._width = Math.abs(rotatedX * 2) / pixelsPerMeter;
      }

      this._updatePolygonCoordinates();
      this.updateProperties();
    });
  }

  /**
   * Déplace le rectangle
   */
  moveFromCenter(newLatLng: L.LatLng): void {
    performanceMonitor.measure('Rectangle.moveFromCenter', () => {
      this._center = newLatLng;
      this._updatePolygonCoordinates();
      this.updateProperties();
    });
  }

  /**
   * Met à jour les propriétés du rectangle
   */
  updateProperties(): void {
    performanceMonitor.measure('Rectangle.updateProperties', () => {
      const rotatedCorners = this.getRotatedCorners();
      
      // Préserver le nom existant s'il existe
      const existingName = this.properties?.style?.name || '';
      
      this.properties = {
        ...this.properties,
        width: this._width,
        height: this._height,
        surface: this._width * this._height,
        perimeter: 2 * (this._width + this._height),
        center: this._center,
        corners: rotatedCorners,
        midPoints: this.getMidPoints(),
        rotation: this._rotation,
        style: {
          ...this.options,
          color: this.options.color || '#2b6451',
          weight: this.options.weight || 3,
          opacity: this.options.opacity || 1,
          fillColor: this.options.fillColor || '#2b6451',
          fillOpacity: this.options.fillOpacity || 0.2,
          dashArray: (this.options as any)?.dashArray || '',
          name: existingName
        }
      };

      this.fire('properties:updated', {
        shape: this,
        properties: this.properties,
        corners: rotatedCorners,
        midPoints: this.getMidPoints()
      });
    });
  }

  /**
   * Définit le nom du rectangle
   */
  setName(name: string): void {
    performanceMonitor.measure('Rectangle.setName', () => {
      if (!this.properties.style) {
        this.properties.style = {};
      }
      this.properties.style.name = name;
      // Propager le changement
      this.fire('properties:updated', {
        shape: this,
        properties: this.properties
      });
    });
  }
  
  /**
   * Obtient le nom du rectangle
   */
  getName(): string {
    return performanceMonitor.measure('Rectangle.getName', () => 
      this.properties?.style?.name || ''
    );
  }

  /**
   * Génère les points d'aide pour faciliter le positionnement d'autres formes
   * en tenant compte de la rotation du rectangle
   */
  generateHelperPoints(map: L.Map, cornerColor: string = 'rgba(220, 38, 38, 0.5)', midColor: string = 'rgba(37, 99, 235, 0.5)'): void {
    performanceMonitor.measure('Rectangle.generateHelperPoints', () => {
      // Nettoyer les points d'aide existants
      this.clearHelperPoints();
      
      // Obtenir les coins et les points milieux avec la rotation appliquée
      const corners = this.getRotatedCorners();
      const midPoints = this.getMidPoints();
      
      // Créer les marqueurs de coins
      this._helperPoints.corners = corners.map(corner => 
        L.circleMarker(corner, {
          radius: 5,
          color: cornerColor,
          fillColor: cornerColor,
          fillOpacity: 0.6,
          weight: 1,
          opacity: 0.8,
          className: 'rectangle-helper-corner',
          pmIgnore: true,
          interactive: false
        }).addTo(map)
      );
      
      // Créer les marqueurs de points milieux
      this._helperPoints.midPoints = midPoints.map(mid => 
        L.circleMarker(mid, {
          radius: 5,
          color: midColor,
          fillColor: midColor,
          fillOpacity: 0.6,
          weight: 1,
          opacity: 0.8,
          className: 'rectangle-helper-midpoint',
          pmIgnore: true,
          interactive: false
        }).addTo(map)
      );
    });
  }
  
  /**
   * Nettoie les points d'aide de la carte
   */
  clearHelperPoints(): void {
    performanceMonitor.measure('Rectangle.clearHelperPoints', () => {
      // Supprimer les marqueurs de coins
      this._helperPoints.corners.forEach(marker => {
        if (marker && marker.remove) {
          try {
            marker.remove();
          } catch (error) {
            console.warn('Erreur lors de la suppression d\'un point d\'aide de coin:', error);
          }
        }
      });
      
      // Supprimer les marqueurs de points milieux
      this._helperPoints.midPoints.forEach(marker => {
        if (marker && marker.remove) {
          try {
            marker.remove();
          } catch (error) {
            console.warn('Erreur lors de la suppression d\'un point d\'aide de milieu:', error);
          }
        }
      });
      
      // Réinitialiser les tableaux
      this._helperPoints.corners = [];
      this._helperPoints.midPoints = [];
    });
  }
  
  /**
   * Met à jour la position des points d'aide
   */
  updateHelperPointPositions(): void {
    performanceMonitor.measure('Rectangle.updateHelperPointPositions', () => {
      if (this._helperPoints.corners.length === 0 && this._helperPoints.midPoints.length === 0) {
        return; // Pas de points d'aide à mettre à jour
      }
      
      // Obtenir les nouvelles positions
      const corners = this.getRotatedCorners();
      const midPoints = this.getMidPoints();
      
      // Mettre à jour les positions des coins
      corners.forEach((corner, index) => {
        if (this._helperPoints.corners[index]) {
          this._helperPoints.corners[index].setLatLng(corner);
        }
      });
      
      // Mettre à jour les positions des points milieux
      midPoints.forEach((mid, index) => {
        if (this._helperPoints.midPoints[index]) {
          this._helperPoints.midPoints[index].setLatLng(mid);
        }
      });
    });
  }
  
  /**
   * Trouve le point le plus proche (coin ou milieu) du point donné
   */
  findClosestHelperPoint(point: L.LatLng): L.LatLng | null {
    return performanceMonitor.measure('Rectangle.findClosestHelperPoint', () => {
      const corners = this.getRotatedCorners();
      const midPoints = this.getMidPoints();
      const allPoints = [...corners, ...midPoints];
      
      if (allPoints.length === 0) return null;
      
      let closestPoint = allPoints[0];
      let minDistance = point.distanceTo(closestPoint);
      
      for (let i = 1; i < allPoints.length; i++) {
        const distance = point.distanceTo(allPoints[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = allPoints[i];
        }
      }
      
      return closestPoint;
    });
  }

  /**
   * Affiche ou masque les points d'aide
   */
  toggleHelperPoints(map: L.Map | null, show: boolean, cornerColor?: string, midColor?: string): void {
    performanceMonitor.measure('Rectangle.toggleHelperPoints', () => {
      if (show && map) {
        this.generateHelperPoints(map, cornerColor, midColor);
      } else {
        this.clearHelperPoints();
      }
    });
  }
  
  /**
   * Vérifie si un point est à l'intérieur du rectangle pivoté
   */
  containsPoint(point: L.LatLng): boolean {
    return performanceMonitor.measure('Rectangle.containsPoint', () => {
      // Obtenir les coins dans le sens antihoraire
      const corners = this.getRotatedCorners();
      if (corners.length !== 4) return false;
      
      // Utiliser l'algorithme du "point-in-polygon" pour déterminer si le point est à l'intérieur
      let inside = false;
      for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].lng;
        const yi = corners[i].lat;
        const xj = corners[j].lng;
        const yj = corners[j].lat;
        
        const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
            (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      return inside;
    });
  }
} 