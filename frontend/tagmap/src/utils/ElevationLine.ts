import L from 'leaflet';
import { Line } from './Line';
import { lineString } from '@turf/turf';
import along from '@turf/along';
import { performanceMonitor } from './usePerformanceMonitor';

// Interface étendue pour inclure name
interface ExtendedPolylineOptions extends L.PolylineOptions {
  name?: string;
}

/**
 * ElevationLine étend la classe personnalisée Line pour ajouter un profil altimétrique.
 *
 * Points importants :
 * - Utilise l'API Open‑Elevation pour récupérer l'altitude à chaque point d'échantillonnage.
 * - Si la ligne comporte uniquement 2 points, elle génère des points intermédiaires (ici 20 par défaut)
 *   pour obtenir un profil continu.
 * - Intègre une logique de retry (MAX_RETRIES) avec un délai (RETRY_DELAY) et un fallback vers
 *   une simulation en cas d'échec de l'API.
 * - Lors de l'update des propriétés, les statistiques d'élévation sont recalculées directement à partir
 *   de this.elevationData pour éviter que la méthode parente ne remplace ces valeurs.
 *
 * Note utilisateur : Même pour un segment de 2 points, le profil altimétrique affichera plusieurs
 * échantillons. Si les altitudes des deux points extrêmes sont identiques, la courbe pourra rester plate.
 */
export class ElevationLine extends Line {
  private elevationData: { distance: number; elevation: number }[] = [];
  private elevationProfile: L.Polyline | null = null;
  private elevationMarker: L.CircleMarker | null = null;
  private isZooming: boolean = false;
  private simpleLine: L.Polyline | null = null;
  private isDestroyed: boolean = false;  // Nouveau flag pour suivre l'état de destruction
  private zoomAnimationTimeout: NodeJS.Timeout | null = null;  // Pour gérer les timeouts
  // Paramètres pour l'appel à l'API Open‑Elevation
  private static API_URL = 'https://api.open-elevation.com/api/v1/lookup';
  private static RETRY_DELAY = 2000; // 2 secondes entre les tentatives
  private static MAX_RETRIES = 3;    // Nombre maximal de tentatives
  private static SAMPLE_DISTANCE = 100; // Distance en mètres entre chaque point
  private static MIN_SAMPLES = 10;    // Nombre minimum de points
  private static MAX_SAMPLES = 50;    // Nombre maximum de points

  constructor(
    latlngs: L.LatLngExpression[] | L.LatLngExpression[][],
    options: ExtendedPolylineOptions = {}
  ) {
    // Appeler le constructeur parent avec les options de style
    super(latlngs, {
      ...options,
      color: '#FF4500', // Couleur distincte pour les profils altimétriques
      weight: 4,
      opacity: 0.8,
      interactive: false, // Désactiver l'interaction avec la ligne
      pmIgnore: true     // Désactiver l'édition via Leaflet-Geoman
    });

    // Initialiser les propriétés de base sans les données d'élévation
    this.properties = performanceMonitor.measure('ElevationLine.constructor.initProperties', () => ({
      ...this.properties,
      type: 'ElevationLine',
      style: {
        ...(this.properties.style || {}),
        name: options.name || ''
      },
      elevationProfile: null,
      maxElevation: 0,
      minElevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
      dataSource: 'pending' // 'api', 'simulation' ou 'error'
    }));

    // Écouter les événements après l'initialisation complète
    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements pour les mises à jour du profil
   */
  private setupEventListeners(): void {
    performanceMonitor.measure('ElevationLine.setupEventListeners', () => {
      this.on('move', () => this.updateElevationProfile());
      
      this.on('add', () => {
        if (this._map) {
          this._map.on('zoomstart', this.handleZoomStart, this);
          this._map.on('zoomend', this.handleZoomEnd, this);
          this._map.on('zoomanim', this._animateZoom, this);
        }
      });

      this.on('remove', () => {
        this.cleanupEventListeners();
      });
    });
  }

  private cleanupEventListeners(): void {
    if (this._map) {
      this._map.off('zoomstart', this.handleZoomStart, this);
      this._map.off('zoomend', this.handleZoomEnd, this);
      this._map.off('zoomanim', this._animateZoom, this);
    }
    // Nettoyer les timeouts en cours
    if (this.zoomAnimationTimeout) {
      clearTimeout(this.zoomAnimationTimeout);
      this.zoomAnimationTimeout = null;
    }
  }

  private _animateZoom(e: L.ZoomAnimEvent): void {
    if (this.isDestroyed || !this._map || !this.getLatLngs().length) {
      console.debug('[ElevationLine] Animation de zoom ignorée - ligne détruite ou carte non disponible');
      return;
    }

    // Nettoyer tout timeout existant
    if (this.zoomAnimationTimeout) {
      clearTimeout(this.zoomAnimationTimeout);
      this.zoomAnimationTimeout = null;
    }
    
    try {
      if (this.elevationMarker) {
        this.elevationMarker.remove();
      }

      const path = (this as any)._path;
      if (path) {
        path.style.display = 'none';
      }

      const latlngs = this.getLatLngs() as L.LatLng[];
      if (latlngs && latlngs.length > 0 && this._map && !this.isDestroyed) {
        // Vérifier si la carte est toujours valide
        if (!this._map.getContainer()) {
          console.debug('[ElevationLine] Carte non valide pendant l\'animation de zoom');
          return;
        }

        if (!this.simpleLine) {
          this.simpleLine = L.polyline(latlngs, {
            color: '#FF4500',
            weight: 3,
            opacity: 0.6,
            smoothFactor: 1,
            interactive: false
          });
          
          // Vérifier si la carte est toujours valide avant d'ajouter la ligne
          if (this._map && this._map.getContainer()) {
            this.simpleLine.addTo(this._map);
          }
        } else {
          this.simpleLine.setLatLngs(latlngs);
        }

        if (this.simpleLine && (this.simpleLine as any)._path) {
          const originalTransform = (this.simpleLine as any)._path.style.transform;
          (this.simpleLine as any)._path.style.transform = '';

          this.zoomAnimationTimeout = setTimeout(() => {
            if (this.isDestroyed || !this._map || !this._map.getContainer()) {
              this.cleanup();
              return;
            }

            try {
              if (this.simpleLine && (this.simpleLine as any)._path) {
                (this.simpleLine as any)._path.style.transform = originalTransform;
                (this.simpleLine as any)._path.style.display = '';
              }
              
              if (path && !this.isDestroyed) {
                path.style.display = '';
              }

              if (this._map && this._map.hasLayer(this) && !this.isDestroyed) {
                this.redraw();
              }
            } catch (error) {
              console.warn('[ElevationLine] Erreur lors de la restauration après animation:', error);
              this.cleanup();
            }
          }, 300);
        }
      }
    } catch (error) {
      console.debug('[ElevationLine] Animation de zoom ignorée:', error);
      this.zoomAnimationTimeout = setTimeout(() => {
        if (this.isDestroyed || !this._map || !this._map.getContainer()) {
          this.cleanup();
          return;
        }

        try {
          if ((this as any)._path) {
            (this as any)._path.style.display = '';
          }
          if (this._map && this._map.hasLayer(this) && !this.isDestroyed) {
            this.redraw();
          }
        } catch (e) {
          console.error('[ElevationLine] Erreur lors de la restauration après animation:', e);
          this.cleanup();
        }
      }, 300);
    }
  }

  private handleZoomStart(): void {
    if (this.isDestroyed) return;
    
    performanceMonitor.measure('ElevationLine.handleZoomStart', () => {
      if (this.isZooming || !this._map) return;
      this.isZooming = true;

      try {
        if (this.elevationMarker) {
          this.elevationMarker.remove();
        }
        
        const path = (this as any)._path;
        if (path) {
          path.style.display = 'none';
        }
        
        if (!this.isDestroyed) {
          this.setStyle({ opacity: 0.3 });
        }
      } catch (error) {
        console.error('[ElevationLine] Error in handleZoomStart:', error);
        this.cleanup();
      }
    });
  }

  private handleZoomEnd(): void {
    if (this.isDestroyed) return;
    
    performanceMonitor.measure('ElevationLine.handleZoomEnd', () => {
      if (!this._map) {
        this.isZooming = false;
        return;
      }
      
      try {
        if (this.simpleLine && this._map) {
          this.simpleLine.remove();
          this.simpleLine = null;
        }

        const path = (this as any)._path;
        if (path) {
          path.style.display = '';
        }
        
        if (!this.isDestroyed) {
          this.setStyle({ opacity: 0.8 });
        }
        
        if (this.zoomAnimationTimeout) {
          clearTimeout(this.zoomAnimationTimeout);
        }
        
        this.zoomAnimationTimeout = setTimeout(() => {
          if (this.isDestroyed || !this._map) return;
          
          try {
            if (this._map && this._map.hasLayer(this) && !this.isDestroyed) {
              this.redraw();
            }
          } catch (error) {
            console.warn('[ElevationLine] Erreur lors du redraw après zoom:', error);
            this.cleanup();
          }
        }, 50);
      } catch (error) {
        console.error('[ElevationLine] Error in handleZoomEnd:', error);
      } finally {
        this.isZooming = false;
      }
    });
  }

  private cleanup(): void {
    performanceMonitor.measure('ElevationLine.cleanup', () => {
      this.isZooming = false;
      this.hideElevationMarker();
      
      if (this.zoomAnimationTimeout) {
        clearTimeout(this.zoomAnimationTimeout);
        this.zoomAnimationTimeout = null;
      }
      
      if (this.simpleLine && this._map) {
        try {
          this.simpleLine.remove();
        } catch (error) {
          console.error('[ElevationLine] Error removing simpleLine:', error);
        }
        this.simpleLine = null;
      }
      
      if (this.elevationProfile) {
        try {
          this.elevationProfile.remove();
        } catch (error) {
          console.error('[ElevationLine] Error removing elevationProfile:', error);
        }
        this.elevationProfile = null;
      }

      const path = (this as any)._path;
      if (path) {
        path.style.display = '';
      }
      
      if (!this.isDestroyed && this._map && this._map.hasLayer(this)) {
        this.setStyle({ opacity: 0.8 });
      }
    });
  }

  /**
   * Calcule le nombre optimal de points d'échantillonnage en fonction de la longueur de la ligne
   */
  private calculateOptimalSampleCount(): number {
    return performanceMonitor.measure('ElevationLine.calculateOptimalSampleCount', () => {
      const length = this.getLength();
      // Calculer le nombre de points basé sur la distance
      const pointsByDistance = Math.ceil(length / ElevationLine.SAMPLE_DISTANCE);
      // Limiter entre MIN_SAMPLES et MAX_SAMPLES
      return Math.min(
        Math.max(pointsByDistance, ElevationLine.MIN_SAMPLES),
        ElevationLine.MAX_SAMPLES
      );
    });
  }

  /**
   * Récupère les données d'élévation via l'API Open‑Elevation.
   */
  private async fetchElevationData(retryCount = 0): Promise<void> {
    return performanceMonitor.measure('ElevationLine.fetchElevationData', async () => {
      const latLngs = this.getLatLngs() as L.LatLng[];
      if (latLngs.length === 0) return;
      const totalLength = this.getLength();

      let locationsQuery = "";
      // Calculer le nombre optimal de points
      const sampleCount = this.calculateOptimalSampleCount();
      console.log(`[ElevationLine] Using ${sampleCount} sample points for ${totalLength.toFixed(0)}m line`);

      // Générer les points d'échantillonnage
      const samplePoints: string[] = [];
      for (let i = 0; i < sampleCount; i++) {
        const dist = (i / (sampleCount - 1)) * totalLength;
        const pt = this.getPointAtDistance(dist);
        if (pt) {
          samplePoints.push(`${pt.lat},${pt.lng}`);
        }
      }
      locationsQuery = samplePoints.join('|');

      try {
        const response = await fetch(`${ElevationLine.API_URL}?locations=${locationsQuery}`);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid API response format');
        }

        // Associer chaque point échantillonné à sa distance le long de la ligne
        this.elevationData = data.results.map(
          (result: { latitude: number; longitude: number; elevation: number }, index: number) => ({
            distance: (index / (sampleCount - 1)) * totalLength,
            elevation: result.elevation
          })
        );
        this.properties.dataSource = 'api';
      } catch (error) {
        console.warn(`[ElevationLine] API fetch attempt ${retryCount + 1}/${ElevationLine.MAX_RETRIES} failed:`, error);
        if (retryCount < ElevationLine.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, ElevationLine.RETRY_DELAY));
          return this.fetchElevationData(retryCount + 1);
        }
        console.warn('[ElevationLine] All API attempts failed, falling back to simulation');
        this.simulateElevationData();
        this.properties.dataSource = 'simulation';
      }
      this.calculateElevationStatistics();
    });
  }

  /**
   * Fallback : simulation de données d'élévation via une fonction sinusoïdale.
   */
  private simulateElevationData(): void {
    performanceMonitor.measure('ElevationLine.simulateElevationData', () => {
      const totalLength = this.getLength();
      const sampleCount = this.calculateOptimalSampleCount();
      
      this.elevationData = Array.from({ length: sampleCount }, (_, index) => {
        const distance = (index / (sampleCount - 1)) * totalLength;
        const elevation = 100 + Math.sin(distance / totalLength * Math.PI * 2) * 50;
        return { distance, elevation };
      });
    });
  }

  /**
   * Calcule les statistiques d'élévation (min, max, dénivelé positif et négatif)
   * à partir de this.elevationData.
   */
  private calculateElevationStatistics(): void {
    performanceMonitor.measure('ElevationLine.calculateElevationStatistics', () => {
      if (!this.elevationData.length) return;
      
      const elevations = this.elevationData.map(d => d.elevation);
      const maxElevation = elevations.length ? Math.max(...elevations) : 0;
      const minElevation = elevations.length ? Math.min(...elevations) : 0;
      let gain = 0;
      let loss = 0;
      let maxSlope = 0;
      let totalSlope = 0;
      let slopeCount = 0;

      console.log('[ElevationLine][calculateElevationStatistics] Données brutes:', {
        elevationsCount: elevations.length,
        maxElevation,
        minElevation
      });

      for (let i = 1; i < this.elevationData.length; i++) {
        const prevPoint = this.elevationData[i - 1];
        const currPoint = this.elevationData[i];
        
        // Calcul du dénivelé
        const elevationDiff = currPoint.elevation - prevPoint.elevation;
        if (elevationDiff > 0) {
          gain += elevationDiff;
        } else {
          loss += Math.abs(elevationDiff);
        }

        // Calcul de la pente
        const distanceDiff = currPoint.distance - prevPoint.distance;
        if (distanceDiff > 0) {
          const slope = (elevationDiff / distanceDiff) * 100; // Convertir en pourcentage
          maxSlope = Math.max(maxSlope, Math.abs(slope));
          totalSlope += Math.abs(slope);
          slopeCount++;
        }
      }

      console.log('[ElevationLine][calculateElevationStatistics] Calculs intermédiaires:', {
        gain,
        loss,
        maxSlope,
        averageSlope: slopeCount > 0 ? totalSlope / slopeCount : 0
      });

      // Mettre à jour les propriétés avec toutes les données nécessaires
      this.properties = {
        ...this.properties,
        type: 'ElevationLine',
        maxElevation,
        minElevation,
        elevationGain: gain,
        elevationLoss: loss,
        maxSlope: maxSlope,
        averageSlope: slopeCount > 0 ? totalSlope / slopeCount : 0,
        elevationData: this.elevationData,
        dataSource: this.properties.dataSource,
        length: this.getLength()
      };

      console.log('[ElevationLine][calculateElevationStatistics] Propriétés mises à jour:', this.properties);
    });
  }

  /**
   * Affiche un marqueur sur la ligne à la distance spécifiée et émet l'événement 'elevation:show'.
   */
  showElevationAt(distance: number): void {
    performanceMonitor.measure('ElevationLine.showElevationAt', () => {
      if (!this.elevationData.length || !this._map) return;
      
      try {
        const point = this.elevationData.reduce((prev, curr) =>
          Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev
        );
        
        const latLng = this.getPointAtDistance(distance);
        if (!latLng) return;
        
        if (!this.elevationMarker) {
          // Créer le marqueur avec un style plus visible
          this.elevationMarker = L.circleMarker(latLng, {
            radius: 6,
            color: '#FF4500',
            fillColor: '#FF4500',
            fillOpacity: 1,
            weight: 2,
            className: 'elevation-marker'
          });
          
          // Ajouter un tooltip permanent
          this.elevationMarker.bindTooltip(
            `Distance: ${this.formatDistance(point.distance)}<br>Altitude: ${this.formatElevation(point.elevation)}`,
            {
              permanent: true,
              direction: 'top',
              offset: [0, -10],
              className: 'elevation-marker-tooltip'
            }
          );
          
          // Vérifier que la carte est toujours valide avant d'ajouter le marqueur
          if (this._map && this._map.hasLayer(this)) {
            this.elevationMarker.addTo(this._map);
          }
        } else {
          // Mettre à jour la position et le contenu du tooltip
          this.elevationMarker.setLatLng(latLng);
          this.elevationMarker.setTooltipContent(
            `Distance: ${this.formatDistance(point.distance)}<br>Altitude: ${this.formatElevation(point.elevation)}`
          );
        }
        
        this.fire('elevation:show', {
          distance,
          elevation: point.elevation,
          latLng
        });
      } catch (error) {
        console.error('[ElevationLine] Erreur lors de l\'affichage de l\'élévation:', error);
        this.hideElevationMarker();
      }
    });
  }

  /**
   * Supprime le marqueur d'élévation s'il existe.
   */
  hideElevationMarker(): void {
    performanceMonitor.measure('ElevationLine.hideElevationMarker', () => {
      if (this.elevationMarker) {
        this.elevationMarker.remove();
        this.elevationMarker = null;
      }
    });
  }

  /**
   * Retourne le point géographique sur la ligne correspondant à la distance donnée.
   */
  private getPointAtDistance(distance: number): L.LatLng | null {
    return performanceMonitor.measure('ElevationLine.getPointAtDistance', () => {
      try {
        const latLngs = this.getLatLngs() as L.LatLng[];
        const coordinates = latLngs.map(ll => [ll.lng, ll.lat]);
        const line = lineString(coordinates);
        const point = along(line, distance, { units: 'meters' });
        return L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0]);
      } catch (error) {
        console.error('Error calculating point at distance', error);
        return null;
      }
    });
  }

  // --- Surcharges pour maintenir le type ElevationLine ---

  override moveVertex(vertexIndex: number, newLatLng: L.LatLng, updateProps: boolean = false): void {
    performanceMonitor.measure('ElevationLine.moveVertex', () => {
      super.moveVertex(vertexIndex, newLatLng, false);
      this.properties.type = 'ElevationLine';
      if (updateProps) {
        this.updateElevationProfile();
      }
    });
  }

  // Désactivation de l'ajout de vertex intermédiaires (non autorisé pour un profil altimétrique)
  override addVertex(_segmentIndex: number, _newLatLng: L.LatLng, _updateProps: boolean = false): void {
    performanceMonitor.measure('ElevationLine.addVertex', () => {
      console.warn('[ElevationLine] Tentative d\'ajout de vertex ignorée - non autorisé pour un profil altimétrique');
    });
  }

  override setLatLngs(latlngs: L.LatLngExpression[] | L.LatLngExpression[][]): this {
    return performanceMonitor.measure('ElevationLine.setLatLngs', () => {
      super.setLatLngs(latlngs);
      this.properties.type = 'ElevationLine';
      this.updateElevationProfile();
      return this;
    });
  }

  override move(deltaLatLng: L.LatLng, updateProps: boolean = true): this {
    return performanceMonitor.measure('ElevationLine.move', () => {
      super.move(deltaLatLng, false);
      this.properties.type = 'ElevationLine';
      if (updateProps) {
        this.updateElevationProfile();
      }
      return this;
    });
  }

  /**
   * Définit le nom de la ligne d'élévation
   */
  setName(name: string): void {
    performanceMonitor.measure('ElevationLine.setName', () => {
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
   * Obtient le nom de la ligne d'élévation
   */
  getName(): string {
    return performanceMonitor.measure('ElevationLine.getName', () => 
      this.properties?.style?.name || ''
    );
  }

  private formatDistance(distance: number): string {
    return performanceMonitor.measure('ElevationLine.formatDistance', () => 
      distance >= 1000 
        ? `${(distance / 1000).toFixed(2)} km`
        : `${distance.toFixed(0)} m`
    );
  }

  private formatElevation(elevation: number): string {
    return performanceMonitor.measure('ElevationLine.formatElevation', () => 
      `${elevation.toFixed(0)} m`
    );
  }

  /**
   * Surcharge de onAdd pour afficher les points d'échantillonnage
   */
  override onAdd(map: L.Map): this {
    return performanceMonitor.measure('ElevationLine.onAdd', () => {
      super.onAdd(map);
      return this;
    });
  }

  /**
   * Surcharge de onRemove pour nettoyer les points d'échantillonnage et la ligne simple
   */
  override onRemove(map: L.Map): this {
    this.isDestroyed = true;
    this.cleanupEventListeners();
    this.cleanup();
    return super.onRemove(map);
  }

  /**
   * Met à jour le profil d'élévation
   */
  async updateElevationProfile(): Promise<void> {
    return performanceMonitor.measure('ElevationLine.updateElevationProfile', async () => {
      try {
        // Check if we already have elevation data and dataSource is 'restored'
        if (this.properties.elevationData && this.properties.dataSource === 'restored') {
          // Use the stored data
          this.elevationData = this.properties.elevationData;
          this.calculateElevationStatistics();
          
          // Vérifier que la carte est toujours valide avant d'afficher les points
          if (this._map && this._map.hasLayer(this)) {
            this.redraw();
          }
          
          this.fire('elevation:updated', {
            shape: this,
            elevationData: this.elevationData,
            properties: this.properties
          });
          return;
        }

        // If no stored data or not restored, fetch new data
        await this.fetchElevationData();
        this.updateProperties();
        
        // Vérifier que la carte est toujours valide avant d'afficher les points
        if (this._map && this._map.hasLayer(this)) {
          this.redraw();
        }
        
        this.fire('elevation:updated', {
          shape: this,
          elevationData: this.elevationData,
          properties: this.properties
        });
      } catch (error) {
        console.error('[ElevationLine] Erreur lors de la mise à jour du profil d\'élévation:', error);
        // Assurer que les propriétés restent cohérentes même en cas d'erreur
        this.properties.dataSource = 'error';
      }
    });
  }

  /**
   * Surcharge de updateProperties pour gérer correctement les données d'élévation
   */
  override updateProperties(): void {
    performanceMonitor.measure('ElevationLine.updateProperties', () => {
      // Appeler d'abord la méthode parente pour les propriétés de base
      super.updateProperties();

      // Ne mettre à jour les statistiques d'élévation que si nous avons des données
      if (this.elevationData && this.elevationData.length > 0) {
        const elevations = this.elevationData.map(d => d.elevation);
        const maxElevation = Math.max(...elevations);
        const minElevation = Math.min(...elevations);
        let gain = 0;
        let loss = 0;
        let maxSlope = 0;
        let totalSlope = 0;
        let slopeCount = 0;

        for (let i = 1; i < this.elevationData.length; i++) {
          const prevPoint = this.elevationData[i - 1];
          const currPoint = this.elevationData[i];
          
          // Calcul du dénivelé
          const elevationDiff = currPoint.elevation - prevPoint.elevation;
          if (elevationDiff > 0) {
            gain += elevationDiff;
          } else {
            loss += Math.abs(elevationDiff);
          }

          // Calcul de la pente
          const distanceDiff = currPoint.distance - prevPoint.distance;
          if (distanceDiff > 0) {
            const slope = (elevationDiff / distanceDiff) * 100;
            maxSlope = Math.max(maxSlope, Math.abs(slope));
            totalSlope += Math.abs(slope);
            slopeCount++;
          }
        }

        // Sauvegarder les coordonnées exactes
        const latLngs = this.getLatLngs() as L.LatLng[];
        const coordinates = latLngs.map(ll => ({
          lat: ll.lat,
          lng: ll.lng
        }));

        // Mettre à jour les propriétés avec les nouvelles statistiques
        this.properties = {
          ...this.properties,
          type: 'ElevationLine',
          coordinates: coordinates,
          elevationData: this.elevationData.map(d => ({
            distance: d.distance,
            elevation: d.elevation
          })),
          maxElevation,
          minElevation,
          elevationGain: gain,
          elevationLoss: loss,
          maxSlope,
          averageSlope: slopeCount > 0 ? totalSlope / slopeCount : 0,
          dataSource: this.properties.dataSource || 'api'
        };

        // Émettre un événement pour notifier les changements
        this.fire('properties:updated', {
          shape: this,
          properties: this.properties
        });
      }
    });
  }

  /**
   * Retourne le tableau des données d'élévation sous forme de {distance, elevation}.
   */
  getElevationData(): { distance: number; elevation: number }[] {
    return performanceMonitor.measure('ElevationLine.getElevationData', () => 
      this.elevationData
    );
  }
}
