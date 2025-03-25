import L from 'leaflet';
import { performanceMonitor } from './usePerformanceMonitor';

// Interface étendue pour inclure name
interface ExtendedPolylineOptions extends L.PolylineOptions {
  name?: string;
}

interface CircleArcProperties {
  type: string;
  radius: number;
  startAngle: number;
  stopAngle: number;
  orientation?: number;
  openingAngle?: number;
  surface?: number;
  arcLength?: number;
  perimeter?: number;
  diameter?: number;
  center?: L.LatLng;
  style: {
    fillColor?: string;
    fillOpacity?: number;
    color?: string;
    weight?: number;
    startAngle?: number;
    stopAngle?: number;
    name?: string;
  };
}

export class CircleArc extends L.Polygon {
  private center: L.LatLng;
  private radius: number;
  private startAngle: number;
  private stopAngle: number;
  private numPoints: number;
  public properties: CircleArcProperties;
  public pm: any;
  constructor(
    center: L.LatLng,
    radius: number,
    startAngle: number = 0,
    stopAngle: number = 180,
    options: ExtendedPolylineOptions = {}
  ) {
    super([[]], {
      ...options,
      pmIgnore: false,
      interactive: true,
      className: 'leaflet-semicircle'
    });
    this.center = center;
    this.radius = radius;
    this.startAngle = this.normalizeAngle(startAngle);
    this.stopAngle = this.normalizeAngle(stopAngle);
    this.numPoints = 64;
    this.properties = performanceMonitor.measure('CircleArc.constructor.initProperties', () => ({
      type: 'Semicircle',
      radius: this.radius,
      startAngle: this.startAngle,
      stopAngle: this.stopAngle,
      style: {
        ...options,
        startAngle: this.startAngle,
        stopAngle: this.stopAngle,
        name: options.name || ''
      }
    }));
    this.on('pm:enable', () => {
      if (this.pm) {
        this.pm._layers = [];
        this.pm._markers = [];
        this.pm._markerGroup?.clearLayers();
      }
    });
    this.on('pm:vertexadded', () => {
      if (this.pm) {
        this.pm._markerGroup?.clearLayers();
      }
    });
    this.on('add', () => {
      if (this._map) {
        this.updateGeometry();
        if (this.pm) {
          this.pm.enable({
            allowSelfIntersection: false,
            preventMarkerRemoval: true
          });
        }
      }
    });
    this.updateProperties();
  }
  /**
   * Normalise un angle entre 0 et 360 degrés
   */
  private normalizeAngle(angle: number): number {
    return performanceMonitor.measure('CircleArc.normalizeAngle', () => 
      ((angle % 360) + 360) % 360
    );
  }
  /**
   * Calcule les points qui composent l'arc
   */
  private calculateArcPoints(): L.LatLng[] {
    return performanceMonitor.measure('CircleArc.calculateArcPoints', () => {
      if (!this._map) return [];
      const points: L.LatLng[] = [];
      const angleRange = this.getOpeningAngle();
      points.push(this.center);
      for (let i = 0; i <= this.numPoints; i++) {
        const angle = this.startAngle + (angleRange * i) / this.numPoints;
        const rad = (angle * Math.PI) / 180;
        const dx = this.radius * Math.cos(rad);
        const dy = this.radius * Math.sin(rad);
        const latOffset = (dy / 111319.9);
        const lngOffset = (dx / (111319.9 * Math.cos(this.center.lat * Math.PI / 180)));
        const point = L.latLng(
          this.center.lat + latOffset,
          this.center.lng + lngOffset
        );
        points.push(point);
      }
      points.push(this.center);
      return points;
    });
  }
  /**
   * Définit le rayon du demi-cercle
   */
  setRadius(radius: number): this {
    return performanceMonitor.measure('CircleArc.setRadius', () => {
      if (radius <= 0) return this;
      this.radius = radius;
      this.properties.radius = radius;
      this.updateGeometry();
      this.updateProperties();
      return this;
    });
  }
  /**
   * Définit les angles de début et de fin du demi-cercle
   */
  setAngles(startAngle: number, stopAngle: number): this {
    return performanceMonitor.measure('CircleArc.setAngles', () => {
      const normalizedStart = this.normalizeAngle(startAngle);
      const normalizedStop = this.normalizeAngle(stopAngle);
      const currentOpeningAngle = this.getOpeningAngle();
      let newOpeningAngle = (normalizedStop - normalizedStart + 360) % 360;
      const maxAngleChange = 45;
      
      if (Math.abs(newOpeningAngle - currentOpeningAngle) > maxAngleChange) {
        if (newOpeningAngle > currentOpeningAngle) {
          newOpeningAngle = currentOpeningAngle + maxAngleChange;
        } else {
          newOpeningAngle = currentOpeningAngle - maxAngleChange;
        }
      }

      newOpeningAngle = Math.max(5, Math.min(355, newOpeningAngle));

      if (this.startAngle === startAngle) {
        this.stopAngle = (this.startAngle + newOpeningAngle) % 360;
      } else {
        this.startAngle = normalizedStart;
        this.stopAngle = (normalizedStart + newOpeningAngle) % 360;
      }

      this.properties.startAngle = this.startAngle;
      this.properties.stopAngle = this.stopAngle;
      this.properties.openingAngle = newOpeningAngle;
      this.properties.style.startAngle = this.startAngle;
      this.properties.style.stopAngle = this.stopAngle;

      this.updateGeometry();
      return this;
    });
  }
  /**
   * Définit l'angle d'ouverture du demi-cercle
   */
  setOpeningAngle(angle: number): this {
    return performanceMonitor.measure('CircleArc.setOpeningAngle', () => {
      if (angle < 5 || angle > 355) return this;
      this.stopAngle = (this.startAngle + angle) % 360;
      this.properties.openingAngle = angle;
      this.updateGeometry();
      this.updateProperties();
      return this;
    });
  }
  /**
   * Définit le centre du demi-cercle
   */
  setCenter(center: L.LatLng): this {
    return performanceMonitor.measure('CircleArc.setCenter', () => {
      if (!center.lat || !center.lng) return this;
      this.center = center;
      this.updateGeometry();
      this.updateProperties();
      return this;
    });
  }
  /**
   * Retourne le centre du demi-cercle
   */
  getCenter(): L.LatLng {
    return performanceMonitor.measure('CircleArc.getCenter', () => this.center);
  }
  /**
   * Retourne le rayon du demi-cercle
   */
  getRadius: () => number = () => {
    return this.radius;
  };
  /**
   * Retourne l'angle de début de l'arc
   */
  getStartAngle: () => number = () => {
    return this.startAngle;
  };
  /**
   * Retourne l'angle de fin de l'arc
   */
  getStopAngle: () => number = () => {
    return this.stopAngle;
  };
  /**
   * Retourne l'angle d'ouverture entre le début et la fin de l'arc
   */
  getOpeningAngle(): number {
    return performanceMonitor.measure('CircleArc.getOpeningAngle', () => 
      (this.stopAngle - this.startAngle + 360) % 360
    );
  }
  /**
   * Calcule la position d'un point sur l'arc en fonction d'un angle donné
   */
  calculatePointOnArc(angle: number): L.LatLng {
    return performanceMonitor.measure('CircleArc.calculatePointOnArc', () => {
      const rad = (angle * Math.PI) / 180;
      const dx = this.radius * Math.cos(rad);
      const dy = this.radius * Math.sin(rad);
      const latOffset = (dy / 111319.9);
      const lngOffset = (dx / (111319.9 * Math.cos(this.center.lat * Math.PI / 180)));
      return L.latLng(
        this.center.lat + latOffset,
        this.center.lng + lngOffset
      );
    });
  }
  /**
   * Calcule la position du point au milieu de l'arc
   */
  calculateMidpointPosition(): L.LatLng {
    return performanceMonitor.measure('CircleArc.calculateMidpointPosition', () => {
      const openingAngle = this.getOpeningAngle();
      const midAngle = (this.startAngle + (openingAngle / 2)) % 360;
      return this.calculatePointOnArc(midAngle);
    });
  }
  /**
   * Calcule l'angle depuis le centre vers un point
   */
  calculateAngleToPoint(point: L.LatLng): number {
    return performanceMonitor.measure('CircleArc.calculateAngleToPoint', () => 
      Math.atan2(
        point.lat - this.center.lat,
        point.lng - this.center.lng
      ) * 180 / Math.PI
    );
  }
  /**
   * Crée les points de contrôle pour l'édition de l'arc
   */
  createControlPoints(map: L.Map, callback: (controlPoints: any[]) => void): void {
    performanceMonitor.measure('CircleArc.createControlPoints', () => {
      const controlPoints = [];
      const startPoint = this.calculatePointOnArc(this.startAngle);
      const stopPoint = this.calculatePointOnArc(this.stopAngle);
      const midPoint = this.calculateMidpointPosition();
      
      const centerPoint = this.createControlPoint(map, this.center, '#059669');
      const startControl = this.createControlPoint(map, startPoint, '#DC2626');
      const stopControl = this.createControlPoint(map, stopPoint, '#DC2626');
      const radiusControl = this.createControlPoint(map, midPoint, '#2563EB');
      
      controlPoints.push(centerPoint, startControl, stopControl, radiusControl);
      callback(controlPoints);
    });
  }
  /**
   * Crée un point de contrôle avec un style spécifique
   */
  private createControlPoint(map: L.Map, position: L.LatLng, color: string): L.CircleMarker {
    return performanceMonitor.measure('CircleArc.createControlPoint', () => 
      L.circleMarker(position, {
        radius: 6,
        color: color,
        fillColor: color,
        fillOpacity: 1,
        weight: 2,
        className: 'control-point',
        pmIgnore: true
      } as L.CircleMarkerOptions).addTo(map)
    );
  }
  /**
   * Calcule et met à jour toutes les propriétés géométriques
   */
  updateProperties(): void {
    performanceMonitor.measure('CircleArc.updateProperties', () => {
      const openingAngle = this.getOpeningAngle();
      const surface = (Math.PI * Math.pow(this.radius, 2) * openingAngle) / 360;
      const arcLength = (2 * Math.PI * this.radius * openingAngle) / 360;
      const perimeter = arcLength + 2 * this.radius;
      
      console.log('\nMise à jour des propriétés du secteur de cercle:');
      console.log(`- Rayon: ${this.radius.toFixed(2)}m`);
      console.log(`- Angle d'ouverture: ${openingAngle.toFixed(2)}°`);
      console.log(`- Surface calculée: ${surface.toFixed(2)}m²`);
      console.log(`- Longueur d'arc: ${arcLength.toFixed(2)}m`);
      console.log(`- Périmètre total: ${perimeter.toFixed(2)}m`);
      
      this.properties = {
        type: 'Semicircle',
        radius: this.radius,
        startAngle: this.startAngle,
        stopAngle: this.stopAngle,
        surface: surface,
        arcLength: arcLength,
        perimeter: perimeter,
        openingAngle: openingAngle,
        diameter: this.radius * 2,
        center: {
          lat: this.center.lat,
          lng: this.center.lng
        },
        style: {
          ...this.properties?.style,
          color: this.options.color || '#3388ff',
          weight: this.options.weight || 3,
          opacity: this.options.opacity || 1,
          fillColor: this.options.fillColor || '#3388ff',
          fillOpacity: this.options.fillOpacity || 0.2,
          dashArray: (this.options as any)?.dashArray || '',
          name: this.properties?.style?.name || ''
        }
      };
      
      this.fire('properties:updated', {
        shape: this,
        properties: this.properties
      });
    });
  }
  /**
   * Met à jour la géométrie de l'arc sur la carte
   */
  private updateGeometry(): void {
    performanceMonitor.measure('CircleArc.updateGeometry', () => {
      if (!this._map) return;
      const points = this.calculateArcPoints();
      if (points.length > 0) {
        this.setLatLngs([points]);
        this.updateProperties();
      }
    });
  }
  /**
   * Convertit l'arc en GeoJSON
   */
  toGeoJSON() {
    return performanceMonitor.measure('CircleArc.toGeoJSON', () => {
      const geoJSON = super.toGeoJSON();
      return {
        ...geoJSON,
        properties: {
          ...geoJSON.properties,
          type: 'Semicircle',
          radius: this.radius,
          startAngle: this.startAngle,
          stopAngle: this.stopAngle,
          openingAngle: this.getOpeningAngle()
        }
      };
    });
  }
  /**
   * Définit le nom du demi-cercle
   */
  setName(name: string): void {
    performanceMonitor.measure('CircleArc.setName', () => {
      if (!this.properties.style) {
        this.properties.style = {};
      }
      this.properties.style.name = name;
      this.fire('properties:updated', {
        shape: this,
        properties: this.properties
      });
    });
  }
  
  /**
   * Obtient le nom du demi-cercle
   */
  getName(): string {
    return performanceMonitor.measure('CircleArc.getName', () => 
      this.properties?.style?.name || ''
    );
  }
}