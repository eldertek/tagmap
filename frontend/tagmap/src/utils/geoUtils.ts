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