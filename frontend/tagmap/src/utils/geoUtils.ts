/**
 * Utilitaires pour la gestion des formats géographiques
 */

/**
 * Type pour les coordonnées au format Leaflet [lat, lng]
 */
export type LeafletLatLng = [number, number]; // [latitude, longitude]

/**
 * Type pour les coordonnées au format GeoJSON [lng, lat]
 */
export type GeoJSONCoordinates = [number, number]; // [longitude, latitude]

/**
 * Type pour un point GeoJSON
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONCoordinates;
}

/**
 * Type pour une localisation qui peut être au format Leaflet ou GeoJSON
 */
export type Location = LeafletLatLng | GeoJSONPoint;

/**
 * Type definition for various coordinate formats
 */
export type CoordinateType = 
  | [number, number]
  | { lat: number; lng: number }
  | { coordinates: [number, number] }
  | { coordinates: number[] }
  | { type: string; coordinates: [number, number] }
  | { type: string; coordinates: number[] };

/**
 * Type definition for a latitude/longitude pair
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Convertit des coordonnées Leaflet [lat, lng] en coordonnées GeoJSON [lng, lat]
 * @param latLng Coordonnées Leaflet [latitude, longitude]
 * @returns Coordonnées GeoJSON [longitude, latitude]
 */
export function leafletToGeoJSON(latLng: LeafletLatLng): GeoJSONCoordinates {
  return [latLng[1], latLng[0]]; // Inverser lat, lng -> lng, lat
}

/**
 * Convertit des coordonnées GeoJSON [lng, lat] en coordonnées Leaflet [lat, lng]
 * @param coords Coordonnées GeoJSON [longitude, latitude]
 * @returns Coordonnées Leaflet [latitude, longitude]
 */
export function geoJSONToLeaflet(coords: GeoJSONCoordinates): LeafletLatLng {
  return [coords[1], coords[0]]; // Inverser lng, lat -> lat, lng
}

/**
 * Crée un objet point GeoJSON à partir de coordonnées Leaflet
 * @param latLng Coordonnées Leaflet [latitude, longitude]
 * @returns Objet Point GeoJSON
 */
export function createGeoJSONPoint(latLng: LeafletLatLng): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: leafletToGeoJSON(latLng)
  };
}

/**
 * Extrait les coordonnées Leaflet [lat, lng] à partir d'une localisation qui peut être
 * au format Leaflet ou au format GeoJSON
 * @param location Localisation au format Leaflet ou GeoJSON
 * @returns Coordonnées au format Leaflet [latitude, longitude]
 */
export function getLeafletCoordinates(location: Location): LeafletLatLng {
  if (Array.isArray(location)) {
    // Format déjà Leaflet [lat, lng]
    return location;
  } else if (typeof location === 'object' && location.type === 'Point') {
    // Format GeoJSON
    return geoJSONToLeaflet(location.coordinates);
  }
  throw new Error('Format de localisation non reconnu');
}

/**
 * Extrait les coordonnées GeoJSON [lng, lat] à partir d'une localisation qui peut être
 * au format Leaflet ou au format GeoJSON
 * @param location Localisation au format Leaflet ou GeoJSON
 * @returns Coordonnées au format GeoJSON [longitude, latitude]
 */
export function getGeoJSONCoordinates(location: Location): GeoJSONCoordinates {
  if (Array.isArray(location)) {
    // Format Leaflet [lat, lng]
    return leafletToGeoJSON(location);
  } else if (typeof location === 'object' && location.type === 'Point') {
    // Format déjà GeoJSON
    return location.coordinates;
  }
  throw new Error('Format de localisation non reconnu');
}

/**
 * Extract latitude and longitude from various coordinate formats
 * @param location - Location data in various formats
 * @returns Object containing lat and lng values
 */
export function extractLatLng(location: CoordinateType | null | undefined): LatLng | null {
  if (!location) return null;

  // Handle array format [lat, lng] or [lng, lat] (GeoJSON)
  if (Array.isArray(location)) {
    // If dealing with GeoJSON which typically uses [lng, lat] format
    if (location.length >= 2) {
      // We're assuming arrays are in Leaflet format [lat, lng] for consistency with existing code
      return { lat: location[0], lng: location[1] };
    }
    return null;
  }
  
  // Handle {lat, lng} format (Leaflet/Google Maps)
  if ('lat' in location && 'lng' in location) {
    const { lat, lng } = location;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  }
  
  // Handle GeoJSON format { type: 'Point', coordinates: [lng, lat] }
  if ('type' in location && 'coordinates' in location) {
    const { coordinates } = location;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      // GeoJSON uses [longitude, latitude] order
      return { lat: coordinates[1], lng: coordinates[0] };
    }
    return null;
  }
  
  // Handle { coordinates: [lng, lat] } format
  if ('coordinates' in location) {
    const { coordinates } = location;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      // Assuming GeoJSON order [longitude, latitude]
      return { lat: coordinates[1], lng: coordinates[0] };
    }
    return null;
  }
  
  return null;
}

/**
 * Safely get latitude and longitude from a source, with error handling
 * @param source - The data source containing location information
 * @param notificationStore - Optional notification store for error messages
 * @returns Object containing lat and lng values, or null if invalid
 */
export function safeGetLatLng(
  source: any, 
  notificationStore?: { warning: (message: string) => void }
): LatLng | null {
  try {
    // If the source has a getLatLng method (e.g., Leaflet Marker)
    if (source && typeof source.getLatLng === 'function') {
      const latlng = source.getLatLng();
      if (latlng && !isNaN(latlng.lat) && !isNaN(latlng.lng)) {
        return { lat: latlng.lat, lng: latlng.lng };
      }
    } 
    // Otherwise, try to extract coordinates from the source
    else if (source && source.location) {
      return extractLatLng(source.location);
    }
    
    // If we couldn't get valid coordinates
    if (notificationStore) {
      notificationStore.warning('La position est invalide ou manquante');
    }
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    if (notificationStore) {
      notificationStore.warning('Erreur lors de l\'extraction des coordonnées');
    }
    return null;
  }
}

/**
 * Convert any supported coordinate format to a GeoJSON Point
 * @param location - Location data in various formats
 * @returns GeoJSON Point object or null if invalid
 */
export function toGeoJSONPoint(location: CoordinateType | null): { type: string; coordinates: [number, number] } | null {
  const latLng = extractLatLng(location);
  
  if (!latLng) return null;
  
  return {
    type: 'Point',
    coordinates: [latLng.lng, latLng.lat] // GeoJSON uses [longitude, latitude] order
  };
}

/**
 * Calculate distance between two points on Earth (haversine formula)
 * @param point1 - First point coordinates
 * @param point2 - Second point coordinates
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export default {
  leafletToGeoJSON,
  geoJSONToLeaflet,
  createGeoJSONPoint,
  getLeafletCoordinates,
  getGeoJSONCoordinates,
  extractLatLng,
  safeGetLatLng,
  toGeoJSONPoint,
  calculateDistance
}; 