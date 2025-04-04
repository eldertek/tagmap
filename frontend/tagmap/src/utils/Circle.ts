import L from 'leaflet';
import { performanceMonitor } from './usePerformanceMonitor';

// Interface étendue pour inclure name
interface ExtendedCircleOptions extends L.CircleOptions {
  name?: string;
}

/**
 * Classe Circle personnalisée qui étend L.Circle pour ajouter des fonctionnalités
 * spécifiques à notre application.
 */
export class Circle extends L.Circle {
  properties: any;
  private angleCache: Map<number, {sin: number, cos: number}> = new Map();
  private lastCenter?: L.LatLng;
  private lastCenterCosLat?: number;
  private _pendingNameUpdate: boolean = false;
  private _nameUpdateTimeout: any = null;

  constructor(
    center: L.LatLngExpression,
    options: ExtendedCircleOptions
  ) {
    // Extraire le rayon des options pour l'appel au constructeur parent
    const radius = options.radius || 10; // Valeur par défaut si non spécifiée
    super(center, radius, options);
    
    // Wrapper le reste de l'initialisation dans le performance monitor
    performanceMonitor.measure('Circle.constructor.init', () => {
      // Initialiser les propriétés de base essentielles immédiatement
      this.properties = {
        type: 'Circle',
        style: {
          name: options.name || ''
        }
      };
      
      // Différer la mise à jour complète des propriétés
      requestAnimationFrame(() => {
        this.updateProperties();
      });

      // N'écouter que l'événement 'add' qui est critique
      this.on('add', () => {
        requestAnimationFrame(() => {
          this.updateProperties();
        });
      });
    }, 'Circle');
  }

  /**
   * Calcule et met à jour les propriétés du cercle
   */
  updateProperties(): void {
    performanceMonitor.measure('Circle.updateProperties', () => {
      const radius = this.getRadius();
      const center = this.getLatLng();
      
      // Préserver le nom existant
      const existingName = this.properties?.style?.name || '';
      const existingStyle = this.properties?.style || {};
      
      // Mettre à jour uniquement les propriétés qui ont changé
      const newProperties = {
        type: 'Circle',
        radius: radius,
        diameter: radius * 2,
        surface: Math.PI * Math.pow(radius, 2),
        perimeter: 2 * Math.PI * radius,
        center: {
          lat: center.lat,
          lng: center.lng
        },
        style: {
          ...existingStyle,
          color: this.options.color || '#2b6451',
          weight: this.options.weight || 3,
          opacity: this.options.opacity || 1,
          fillColor: this.options.fillColor || '#2b6451',
          fillOpacity: this.options.fillOpacity || 0.2,
          dashArray: (this.options as any)?.dashArray || '',
          name: existingName
        }
      };

      // Ne déclencher l'événement que si les propriétés ont réellement changé
      if (JSON.stringify(this.properties) !== JSON.stringify(newProperties)) {
        this.properties = newProperties;
        this.fire('properties:updated', {
          shape: this,
          properties: this.properties
        });
      }
    }, 'Circle');
  }
  
  /**
   * Définit le nom du cercle
   */
  setName(name: string): void {
    performanceMonitor.measure('Circle.setName', () => {
      // Si le nom n'a pas changé, ne rien faire
      if (this.properties?.style?.name === name) {
        return;
      }

      if (!this.properties.style) {
        this.properties.style = {};
      }
      this.properties.style.name = name;

      // Si une mise à jour est déjà en attente, ne pas en programmer une nouvelle
      if (this._pendingNameUpdate) {
        return;
      }

      this._pendingNameUpdate = true;

      // Annuler le timeout précédent s'il existe
      if (this._nameUpdateTimeout) {
        clearTimeout(this._nameUpdateTimeout);
      }

      // Programmer la notification après un court délai
      this._nameUpdateTimeout = setTimeout(() => {
        this._pendingNameUpdate = false;
        this._nameUpdateTimeout = null;
        // Propager le changement
        this.fire('properties:updated', {
          shape: this,
          properties: this.properties
        });
      }, 100); // Attendre 100ms avant de notifier
    }, 'Circle');
  }
  
  /**
   * Obtient le nom du cercle
   */
  getName(): string {
    return performanceMonitor.measure('Circle.getName', () => {
      return this.properties?.style?.name || '';
    }, 'Circle');
  }
  /**
   * Surcharge de la méthode setRadius pour mettre à jour les propriétés
   */
  setRadius(radius: number): this {
    return performanceMonitor.measure('Circle.setRadius', () => {
      super.setRadius(radius);
      this.updateProperties();
      return this;
    }, 'Circle');
  }
  /**
   * Surcharge de la méthode setLatLng pour mettre à jour les propriétés
   */
  setLatLng(latlng: L.LatLngExpression): this {
    return performanceMonitor.measure('Circle.setLatLng', () => {
      super.setLatLng(latlng);
      this.updateProperties();
      return this;
    }, 'Circle');
  }
  /**
   * Calcule la position d'un point sur le cercle à un angle donné
   */
  calculatePointOnCircle(angle: number): L.LatLng {
    return performanceMonitor.measure('Circle.calculatePointOnCircle', () => {
      const center = this.getLatLng();
      const radius = this.getRadius();

      // Vérifier si nous avons déjà les valeurs trigonométriques en cache
      let trigValues = this.angleCache.get(angle);
      if (!trigValues) {
        const rad = (angle * Math.PI) / 180;
        trigValues = {
          sin: Math.sin(rad),
          cos: Math.cos(rad)
        };
        this.angleCache.set(angle, trigValues);
      }

      // Calculer et mettre en cache cos(lat) pour le centre si nécessaire
      if (!this.lastCenter || !this.lastCenter.equals(center)) {
        this.lastCenter = center;
        this.lastCenterCosLat = Math.cos(center.lat * Math.PI / 180);
      }

      // Utiliser les valeurs en cache pour le calcul final
      return L.latLng(
        center.lat + (radius / 111319.9) * trigValues.sin,
        center.lng + (radius / (111319.9 * this.lastCenterCosLat!)) * trigValues.cos
      );
    }, 'Circle');
  }
  /**
   * Calcule les positions des points cardinaux du cercle
   */
  getCardinalPoints(): L.LatLng[] {
    return performanceMonitor.measure('Circle.getCardinalPoints', () => {
      return [0, 45, 90, 135, 180, 225, 270, 315].map(angle => 
        this.calculatePointOnCircle(angle)
      );
    }, 'Circle');
  }
  /**
   * Calcule l'angle d'un point par rapport au centre du cercle
   * @param point Le point dont on veut calculer l'angle
   * @returns L'angle en degrés (0-360)
   */
  calculateAngleFromPoint(point: L.LatLng): number {
    return performanceMonitor.measure('Circle.calculateAngleFromPoint', () => {
      const center = this.getLatLng();
      const dx = point.lng - center.lng;
      const dy = point.lat - center.lat;
      // Calculer l'angle en radians puis convertir en degrés
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      // Normaliser l'angle entre 0 et 360 degrés
      if (angle < 0) {
        angle += 360;
      }
      return angle;
    }, 'Circle');
  }
  /**
   * Redimensionne le cercle en gardant le point de contrôle sous la souris
   * @param mouseLatLng Position actuelle de la souris
   */
  resizeFromControlPoint(mouseLatLng: L.LatLng): void {
    performanceMonitor.measure('Circle.resizeFromControlPoint', () => {
      const center = this.getLatLng();
      // Calculer la distance entre le centre et la position de la souris
      // Cette distance devient le nouveau rayon
      const newRadius = center.distanceTo(mouseLatLng);
      // Appliquer le nouveau rayon si valide
      if (newRadius > 0) {
        // Appliquer directement le nouveau rayon sans mettre à jour les propriétés
        // La mise à jour sera faite à la fin du redimensionnement
        super.setRadius(newRadius);
      }
    }, 'Circle');
  }
  // Méthode pour nettoyer le cache si nécessaire
  clearCache(): void {
    this.angleCache.clear();
    this.lastCenter = undefined;
    this.lastCenterCosLat = undefined;
  }
} 