import L from 'leaflet';
import { polygon, area, length, lineString } from '@turf/turf';
import centroid from '@turf/centroid';

// Interface étendue pour inclure name, category et accessLevel
interface ExtendedPolylineOptions extends L.PolylineOptions {
  name?: string;
  category?: string;
  accessLevel?: string;
}

/**
 * Classe Polygon personnalisée qui étend L.Polygon pour ajouter des fonctionnalités
 * spécifiques à notre application.
 */
export class Polygon extends L.Polygon {
  properties: any;
  // Ajouter les propriétés pour le hover effet
  _originalStyle?: L.PathOptions;
  _path?: SVGPathElement;
  
  constructor(
    latlngs: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][],
    options: ExtendedPolylineOptions = {}
  ) {
    super(latlngs, {
      ...options,
      pmIgnore: false,
      interactive: true
    });

    this.properties = {
      type: 'Polygon',
      category: options.category || 'forages',
      accessLevel: options.accessLevel || 'visitor',
      style: {
        color: options.color || '#2b6451',
        weight: options.weight || 3,
        opacity: options.opacity || 1,
        fillColor: options.fillColor || '#2b6451',
        fillOpacity: options.fillOpacity || 0.2,
        dashArray: options.dashArray || '',
        name: options.name || ''
      }
    };
    
    // Ajouter des écouteurs pour le survol
    this.on('mouseover', this.highlight);
    this.on('mouseout', this.unhighlight);

    this.updateProperties();
    this.on({
      add: () => this.updateProperties(),
      edit: () => this.updateProperties(),
      drag: () => this.updateProperties()
    } as any);
  }
  /**
   * Calcule et met à jour les propriétés du polygone
   */
  updateProperties(): void {
    try {
      const latLngs = this.getLatLngs()[0] as L.LatLng[];
      if (!latLngs || latLngs.length < 3) {
        console.warn('Polygon has less than 3 points, cannot calculate properties');
        return;
      }
      // Convertir les points en format GeoJSON pour turf
      const coordinates = latLngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
      coordinates.push(coordinates[0]); // Fermer le polygone
      const polygonFeature = polygon([coordinates]);
      const surfaceValue = area(polygonFeature);
      const perimeterValue = length(lineString([...coordinates]), { units: 'meters' });
      // Calculer le centroid
      const centroidPoint = centroid(polygonFeature);
      const center = L.latLng(
        centroidPoint.geometry.coordinates[1],
        centroidPoint.geometry.coordinates[0]
      );

      // Préserver les propriétés existantes
      const existingName = this.properties?.style?.name || '';
      const existingCategory = this.properties?.category || 'forages';
      const existingAccessLevel = this.properties?.accessLevel || 'visitor';

      // Mettre à jour les propriétés
      this.properties = {
        type: 'Polygon',
        coordinates: latLngs.map(ll => ({
          lat: ll.lat,
          lng: ll.lng
        })),
        surface: surfaceValue,
        perimeter: perimeterValue,
        center: {
          lat: center.lat,
          lng: center.lng
        },
        vertices: latLngs.length,
        category: existingCategory,
        accessLevel: existingAccessLevel,
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
      // Émettre un événement pour notifier les changements
      this.fire('properties:updated', {
        shape: this,
        properties: this.properties
      });
    } catch (error) {
      console.error('Failed to calculate polygon properties', error);
    }
  }

  /**
   * Définit le nom du polygone
   */
  setName(name: string): void {
    if (!this.properties.style) {
      this.properties.style = {};
    }
    this.properties.style.name = name;
    // Propager le changement
    this.fire('properties:updated', {
      shape: this,
      properties: this.properties
    });
  }

  /**
   * Obtient le nom du polygone
   */
  getName(): string {
    return this.properties?.style?.name || '';
  }
  /**
   * Surcharge de la méthode setLatLngs pour mettre à jour les propriétés
   */
  setLatLngs(latlngs: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][]): this {
    super.setLatLngs(latlngs);
    this.updateProperties();
    return this;
  }
  /**
   * Calcule les points milieu de chaque segment du polygone
   */
  getMidPoints(): L.LatLng[] {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    const midPoints: L.LatLng[] = [];
    if (latLngs.length < 2) {
      return midPoints;
    }
    for (let i = 0; i < latLngs.length; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[(i + 1) % latLngs.length]; // Boucle pour le dernier point
      // Calculer le point milieu
      midPoints.push(L.latLng(
        (p1.lat + p2.lat) / 2,
        (p1.lng + p2.lng) / 2
      ));
    }
    return midPoints;
  }
  /**
   * Déplace un vertex sans mettre à jour les propriétés
   * @param vertexIndex L'index du vertex à déplacer
   * @param newLatLng La nouvelle position du vertex
   */
  moveVertex(vertexIndex: number, newLatLng: L.LatLng): void {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    if (vertexIndex >= 0 && vertexIndex < latLngs.length) {
      latLngs[vertexIndex] = newLatLng;
      // Mettre à jour la géométrie sans déclencher updateProperties
      L.Polygon.prototype.setLatLngs.call(this, [latLngs]);
    }
  }
  /**
   * Ajoute un nouveau vertex entre deux vertices existants
   * @param segmentIndex L'index du segment où insérer le vertex (entre segmentIndex et segmentIndex+1)
   * @param newLatLng La position du nouveau vertex
   */
  addVertex(segmentIndex: number, newLatLng: L.LatLng): void {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    if (segmentIndex >= 0 && segmentIndex < latLngs.length) {
      // Insérer le nouveau point
      latLngs.splice((segmentIndex + 1) % latLngs.length, 0, newLatLng);
      // Mettre à jour la géométrie sans déclencher updateProperties
      L.Polygon.prototype.setLatLngs.call(this, [latLngs]);
    }
  }
  /**
   * Déplace le polygone entier
   * @param deltaLatLng Le décalage à appliquer à tous les vertices
   */
  move(deltaLatLng: L.LatLng): this {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    // Créer un nouveau tableau avec les coordonnées déplacées
    const newLatLngs = latLngs.map(point =>
      L.latLng(
        point.lat + deltaLatLng.lat,
        point.lng + deltaLatLng.lng
      )
    );
    // Mettre à jour la géométrie sans déclencher updateProperties
    L.Polygon.prototype.setLatLngs.call(this, [newLatLngs]);
    return this;
  }
  /**
   * Calcule le barycentre du polygone (point pouvant servir pour déplacer la forme)
   */
  getCenter(): L.LatLng {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    if (!latLngs || latLngs.length === 0) {
      return new L.LatLng(0, 0);
    }
    try {
      // Vérifions si les coordonnées sont valides
      const validPoints = latLngs.filter(point =>
        point && typeof point.lat === 'number' && typeof point.lng === 'number' &&
        !isNaN(point.lat) && !isNaN(point.lng) &&
        Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
      );
      if (validPoints.length === 0) {
        console.warn('Aucun point valide dans le polygone pour calculer le centre');
        return new L.LatLng(0, 0);
      }
      const coordinates = validPoints.map((ll: L.LatLng) => [ll.lng, ll.lat]);
      coordinates.push(coordinates[0]); // Fermer le polygone
      const polygonFeature = polygon([coordinates]);
      const centroidPoint = centroid(polygonFeature);
      // Vérifier que le résultat du centroid est valide
      const centerLat = centroidPoint.geometry.coordinates[1];
      const centerLng = centroidPoint.geometry.coordinates[0];
      if (typeof centerLat !== 'number' || typeof centerLng !== 'number' ||
        isNaN(centerLat) || isNaN(centerLng) ||
        Math.abs(centerLat) > 90 || Math.abs(centerLng) > 180) {
        throw new Error('Centroid calculé invalide');
      }
      return L.latLng(centerLat, centerLng);
    } catch (error) {
      console.warn('Erreur lors du calcul du centroïde avec turf.js, utilisation de la méthode simple', error);
      // Méthode alternative: moyenne des coordonnées valides
      let totalLat = 0, totalLng = 0, count = 0;
      for (const point of latLngs) {
        if (point && typeof point.lat === 'number' && typeof point.lng === 'number' &&
          !isNaN(point.lat) && !isNaN(point.lng) &&
          Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180) {
          totalLat += point.lat;
          totalLng += point.lng;
          count++;
        }
      }
      if (count === 0) {
        console.error('Impossible de calculer un centre valide pour le polygone');
        return new L.LatLng(0, 0);
      }
      return new L.LatLng(totalLat / count, totalLng / count);
    }
  }
  /**
   * Retourne les distances entre les vertices consécutifs
   */
  getSegmentLengths(): number[] {
    const latLngs = this.getLatLngs()[0] as L.LatLng[];
    const distances: number[] = [];
    if (latLngs.length < 2) {
      return distances;
    }
    for (let i = 0; i < latLngs.length; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[(i + 1) % latLngs.length]; // Boucle pour le dernier point
      distances.push(p1.distanceTo(p2));
    }
    return distances;
  }
  /**
   * Met en surbrillance le polygone lorsqu'il est survolé
   */
  highlight(): void {
    if (!this._originalStyle) {
      this._originalStyle = {...this.options};
      
      // Appliquer un style plus visible pour le survol
      const newWeight = (this._originalStyle.weight || 3) * 1.5;
      
      this.setStyle({
        weight: newWeight,
        opacity: 1,
        fillOpacity: Math.min((this._originalStyle.fillOpacity || 0.2) + 0.1, 0.4),
        className: 'polygon-hover-effect'
      });
      
      // Ajouter un effet visuel au chemin SVG si accessible
      try {
        if (this._path) {
          // Ajouter un effet de lueur avec CSS
          this._path.style.filter = 'drop-shadow(0 0 3px rgba(43, 100, 81, 0.7))';
          this._path.style.transition = 'all 0.2s ease-in-out';
        }
      } catch (error) {
        console.warn('Impossible d\'appliquer l\'effet de lueur au polygone', error);
      }
    }
  }
  
  /**
   * Restaure le style original du polygone
   */
  unhighlight(): void {
    if (this._originalStyle) {
      this.setStyle(this._originalStyle);
      this._originalStyle = undefined;
      
      // Restaurer le style du chemin SVG
      try {
        if (this._path) {
          this._path.style.filter = '';
          this._path.style.transition = '';
        }
      } catch (error) {
        console.warn('Impossible de restaurer le style du polygone', error);
      }
    }
  }
}