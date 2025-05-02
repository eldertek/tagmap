import L from 'leaflet';
import { lineString, length } from '@turf/turf';
import along from '@turf/along';
import { performanceMonitor } from './usePerformanceMonitor';

// Interface étendue pour inclure name, category et accessLevel
interface ExtendedPolylineOptions extends L.PolylineOptions {
  name?: string;
  category?: string;
  accessLevel?: string;
}

/**
 * Custom Line class that extends L.Polyline to add specific
 * functionality for our application.
 */
export class Line extends L.Polyline {
  properties: any;
  private cachedProperties: {
    length?: number;
    midPoints?: L.LatLng[];
    segmentLengths?: number[];
    center?: L.LatLng;
  } = {};
  private needsUpdate: boolean = true;
  // Original style properties for restoring after hover
  _originalStyle?: L.PathOptions;
  // Accès au path SVG interne de Leaflet (normalement privé)
  _path?: SVGPathElement;
  
  constructor(
    latlngs: L.LatLngExpression[] | L.LatLngExpression[][],
    options: ExtendedPolylineOptions = {}
  ) {
    super(latlngs, {
      ...options,
      pmIgnore: false,
      interactive: true
    });

    this.properties = performanceMonitor.measure('Line.constructor.initProperties', () => ({
      type: 'Line',
      category: options.category || 'forages',
      accessLevel: options.accessLevel || 'visitor',
      style: {
        ...(options || {}),
        name: options.name || ''
      }
    }));

    this.updateProperties();
    this.on('add', () => {
      this.updateProperties();
    });
    
    // Enhanced interaction behavior - highlight on mouseover
    this.on('mouseover', this.highlight);
    this.on('mouseout', this.unhighlight);
  }

  /**
   * Highlight the line when hovering
   */
  highlight(): void {
    if (!this._originalStyle) {
      this._originalStyle = {...this.options};
      
      // Appliquer un style plus visible pour le survol
      const newWeight = (this._originalStyle.weight || 3) * 1.75; // Augmentation plus importante de l'épaisseur
      const newColor = this._originalStyle.color || '#2b6451';
      
      this.setStyle({
        weight: newWeight,
        opacity: 1,
        // Ajouter un effet de "glow" léger avec shadow
        className: 'line-hover-effect'
      });
      
      // Ajouter une classe CSS pour l'effet de lueur si on peut accéder à l'élément DOM
      try {
        if (this._path) {
          // Ajouter un effet de lueur avec CSS
          this._path.style.filter = `drop-shadow(0 0 4px ${newColor})`;
          this._path.style.transition = 'all 0.2s ease-in-out';
        }
      } catch (error) {
        console.warn('Impossible d\'appliquer l\'effet de lueur à la ligne');
      }
    }
  }
  
  /**
   * Restore original style when no longer hovering
   */
  unhighlight(): void {
    if (this._originalStyle) {
      this.setStyle(this._originalStyle);
      this._originalStyle = undefined;
      
      // Retirer l'effet de lueur si on peut accéder à l'élément DOM
      try {
        if (this._path) {
          this._path.style.filter = '';
          this._path.style.transition = '';
        }
      } catch (error) {
        console.warn('Impossible de retirer l\'effet de lueur de la ligne');
      }
    }
  }
  
  /**
   * Check if a point is close to this line within the given tolerance
   * This is useful for better click detection
   */
  isPointNearLine(latlng: L.LatLng, tolerance: number = 10): boolean {
    if (!this._map) return false;
    
    const latLngs = this.getLatLngs() as L.LatLng[];
    if (latLngs.length < 2) return false;
    
    for (let i = 0; i < latLngs.length - 1; i++) {
      const p1 = this._map.latLngToLayerPoint(latLngs[i]);
      const p2 = this._map.latLngToLayerPoint(latLngs[i + 1]);
      const clickPoint = this._map.latLngToLayerPoint(latlng);
      
      // Calculate distance between click and line segment
      const distance = L.LineUtil.pointToSegmentDistance(clickPoint, p1, p2);
      if (distance <= tolerance) {
        return true;
      }
    }
    
    return false;
  }

  updateProperties(): void {
    performanceMonitor.measure('Line.updateProperties', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (!latLngs || latLngs.length < 2) {
        console.warn('Line has less than 2 points, cannot calculate properties');
        return;
      }

      const coordinates = latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
      try {
        const line = lineString(coordinates);
        const lengthValue = length(line, { units: 'meters' });
        let center: L.LatLng;

        if (latLngs.length === 2) {
          center = L.latLng(
            (latLngs[0].lat + latLngs[1].lat) / 2,
            (latLngs[0].lng + latLngs[1].lng) / 2
          );
        } else {
          const alongPoint = along(line, lengthValue / 2, { units: 'meters' });
          center = L.latLng(alongPoint.geometry.coordinates[1], alongPoint.geometry.coordinates[0]);
        }

        const influenceWidth = 10;
        const existingName = this.properties?.style?.name || '';
        const existingCategory = this.properties?.category || 'forages';
        const existingAccessLevel = this.properties?.accessLevel || 'visitor';

        this.properties = {
          type: 'Line',
          length: lengthValue,
          coordinates: latLngs.map(ll => ({
            lat: ll.lat,
            lng: ll.lng
          })),
          center: {
            lat: center.lat,
            lng: center.lng
          },
          vertices: latLngs.length,
          surfaceInfluence: lengthValue * influenceWidth,
          dimensions: {
            width: influenceWidth
          },
          category: existingCategory,
          accessLevel: existingAccessLevel,
          style: {
            ...this.options,
            color: this.options.color || '#2b6451',
            weight: this.options.weight || 3,
            opacity: this.options.opacity || 1,
            dashArray: (this.options as any)?.dashArray || '',
            name: existingName
          }
        };

        this.cachedProperties.length = lengthValue;
        this.cachedProperties.center = center;
        this.cachedProperties.midPoints = undefined;
        this.cachedProperties.segmentLengths = undefined;
        this.needsUpdate = false;

        this.fire('properties:updated', {
          shape: this,
          properties: this.properties
        });
      } catch (error) {
        console.error('Failed to calculate line properties', error);
      }
    });
  }

  setName(name: string): void {
    performanceMonitor.measure('Line.setName', () => {
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

  getName(): string {
    return performanceMonitor.measure('Line.getName', () =>
      this.properties?.style?.name || ''
    );
  }

  invalidateCache(): void {
    performanceMonitor.measure('Line.invalidateCache', () => {
      this.needsUpdate = true;
      this.cachedProperties = {};
    });
  }

  setLatLngs(latlngs: L.LatLngExpression[] | L.LatLngExpression[][]): this {
    super.setLatLngs(latlngs);

    // Invalider TOUT le cache
    this.needsUpdate = true;
    this.cachedProperties = {};

    // Émettre un événement de changement
    this.fire('latlngs:updated', {
      latlngs: this.getLatLngs()
    });

    return this;
  }

  getMidPoints(): L.LatLng[] {
    return performanceMonitor.measure('Line.getMidPoints', () => {
      if (!this.needsUpdate && this.cachedProperties.midPoints) {
        return this.cachedProperties.midPoints;
      }

      const latLngs = this.getLatLngs() as L.LatLng[];
      const midPoints: L.LatLng[] = [];

      if (latLngs.length < 2) {
        return midPoints;
      }

      for (let i = 0; i < latLngs.length - 1; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[i + 1];
        if (!p1 || !p2) {
          console.warn('Points invalides détectés pour le segment', i);
          continue;
        }
        midPoints.push(L.latLng(
          (p1.lat + p2.lat) / 2,
          (p1.lng + p2.lng) / 2
        ));
      }

      this.cachedProperties.midPoints = midPoints;
      return midPoints;
    });
  }

  getMidPointAt(segmentIndex: number): L.LatLng | null {
    return performanceMonitor.measure('Line.getMidPointAt', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (segmentIndex < 0 || segmentIndex >= latLngs.length - 1 || latLngs.length < 2) {
        return null;
      }

      const p1 = latLngs[segmentIndex];
      const p2 = latLngs[segmentIndex + 1];
      if (!p1 || !p2) {
        console.warn('Points invalides pour calcul du midpoint au segment', segmentIndex);
        return null;
      }

      return L.latLng(
        (p1.lat + p2.lat) / 2,
        (p1.lng + p2.lng) / 2
      );
    });
  }

  moveVertex(vertexIndex: number, newLatLng: L.LatLng, updateProps: boolean = false): void {
    performanceMonitor.measure('Line.moveVertex', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (vertexIndex >= 0 && vertexIndex < latLngs.length) {
        latLngs[vertexIndex] = newLatLng;

        // Utiliser setLatLngs pour garantir la propagation des événements
        this.setLatLngs(latLngs);

        // Invalider TOUT le cache
        this.needsUpdate = true;
        this.cachedProperties = {};

        // Émettre l'événement avec toutes les informations nécessaires
        this.fire('vertex:moved', {
          index: vertexIndex,
          latlng: newLatLng,
          allPoints: latLngs
        });

        if (updateProps) {
          this.updateProperties();
        }
      }
    });
  }

  addVertex(segmentIndex: number, newLatLng: L.LatLng, updateProps: boolean = false): void {
    performanceMonitor.measure('Line.addVertex', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (segmentIndex >= 0 && segmentIndex < latLngs.length - 1) {
        latLngs.splice(segmentIndex + 1, 0, newLatLng);
        L.Polyline.prototype.setLatLngs.call(this, latLngs);
        this.needsUpdate = true;
        this.cachedProperties.midPoints = undefined;
        this.cachedProperties.segmentLengths = undefined;
        this.cachedProperties.center = undefined;
        this.cachedProperties.length = undefined;
        if (updateProps) {
          this.updateProperties();
        }
      }
    });
  }

  move(deltaLatLng: L.LatLng, updateProps: boolean = true): this {
    return performanceMonitor.measure('Line.move', () => {
      // Émettre l'événement de début de déplacement
      this.fire('move:start');

      const latLngs = this.getLatLngs() as L.LatLng[];
      const newLatLngs = latLngs.map(point =>
        L.latLng(
          point.lat + deltaLatLng.lat,
          point.lng + deltaLatLng.lng
        )
      );

      // Utiliser setLatLngs pour la mise à jour
      this.setLatLngs(newLatLngs);

      // Invalider TOUT le cache
      this.needsUpdate = true;
      this.cachedProperties = {};

      // Émettre l'événement avec toutes les informations
      this.fire('move', {
        delta: deltaLatLng,
        newPositions: newLatLngs,
        oldPositions: latLngs
      });

      if (updateProps) {
        this.updateProperties();
        // Émettre un événement supplémentaire après la mise à jour des propriétés
        this.fire('properties:updated', {
          shape: this,
          properties: this.properties
        });
        // Émettre l'événement de fin de déplacement
        this.fire('move:end');
      }
      return this;
    });
  }

  getCenter(): L.LatLng {
    return performanceMonitor.measure('Line.getCenter', () => {
      if (!this.needsUpdate && this.cachedProperties.center) {
        return this.cachedProperties.center;
      }

      const latLngs = this.getLatLngs() as L.LatLng[];
      if (latLngs.length < 2) {
        const result = latLngs[0] || new L.LatLng(0, 0);
        return result;
      }

      try {
        const coordinates = latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
        const line = lineString(coordinates);
        const lengthValue = length(line, { units: 'meters' });
        const alongPoint = along(line, lengthValue / 2, { units: 'meters' });
        const result = L.latLng(alongPoint.geometry.coordinates[1], alongPoint.geometry.coordinates[0]);
        this.cachedProperties.center = result;
        return result;
      } catch (error) {
        console.warn('Error calculating line center with turf.js, using simple method', error);
        const lat = latLngs.reduce((sum, p) => sum + p.lat, 0) / latLngs.length;
        const lng = latLngs.reduce((sum, p) => sum + p.lng, 0) / latLngs.length;
        const result = new L.LatLng(lat, lng);
        this.cachedProperties.center = result;
        return result;
      }
    });
  }

  getSegmentLengths(): number[] {
    return performanceMonitor.measure('Line.getSegmentLengths', () => {
      if (!this.needsUpdate && this.cachedProperties.segmentLengths) {
        return this.cachedProperties.segmentLengths;
      }

      const latLngs = this.getLatLngs() as L.LatLng[];
      const distances: number[] = [];
      if (latLngs.length < 2) {
        return distances;
      }

      for (let i = 0; i < latLngs.length - 1; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[i + 1];
        distances.push(p1.distanceTo(p2));
      }

      this.cachedProperties.segmentLengths = distances;
      return distances;
    });
  }

  getSegmentLengthAt(segmentIndex: number): number {
    return performanceMonitor.measure('Line.getSegmentLengthAt', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (segmentIndex < 0 || segmentIndex >= latLngs.length - 1 || latLngs.length < 2) {
        return 0;
      }
      const p1 = latLngs[segmentIndex];
      const p2 = latLngs[segmentIndex + 1];
      return p1.distanceTo(p2);
    });
  }

  getLengthToVertex(vertexIndex: number): number {
    return performanceMonitor.measure('Line.getLengthToVertex', () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      let length = 0;
      if (vertexIndex <= 0 || latLngs.length < 2) {
        return 0;
      }
      for (let i = 0; i < Math.min(vertexIndex, latLngs.length - 1); i++) {
        length += latLngs[i].distanceTo(latLngs[i + 1]);
      }
      return length;
    });
  }

  getLength(): number {
    return performanceMonitor.measure('Line.getLength', () => {
      if (!this.needsUpdate && this.cachedProperties.length) {
        return this.cachedProperties.length;
      }

      const latLngs = this.getLatLngs() as L.LatLng[];
      let totalLength = 0;
      for (let i = 0; i < latLngs.length - 1; i++) {
        totalLength += latLngs[i].distanceTo(latLngs[i + 1]);
      }

      this.cachedProperties.length = totalLength;
      return totalLength;
    });
  }
}