import mapConfig from '@/config/maps.config';
import { settingsService } from '@/services/api';

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Maps JavaScript API
 * @returns Promise that resolves when the API is loaded
 */
export function loadGoogleMapsApi(): Promise<void> {
  // If already loaded, return immediately
  if (isLoaded) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Check if already loaded
      if (window.google && window.google.maps) {
        isLoaded = true;
        resolve();
        return;
      }

      // Récupérer la clé API depuis le backend
      try {
        // Appel au backend pour obtenir l'URL complète avec la clé
        const response = await settingsService.getGoogleMapsApiKey();
        
        // Le backend génère l'URL complète avec la clé
        const googleMapsURL = response?.data?.url || 'https://maps.googleapis.com/maps/api/js?libraries=places';
        
        // Create script element
        const script = document.createElement('script');
        script.type = 'text/javascript';
        
        // Ensure URL has the loading=async parameter
        const url = new URL(googleMapsURL);
        if (!url.searchParams.has('loading')) {
          url.searchParams.append('loading', 'async');
        }
        
        script.src = url.toString();
        script.async = true;
        script.defer = true;

        // Handle script load event
        script.onload = () => {
          isLoaded = true;
          resolve();
        };

        // Handle script error event
        script.onerror = () => {
          loadPromise = null;
          reject(new Error('Failed to load Google Maps API'));
        };

        // Add script to document
        document.head.appendChild(script);
      } catch (error) {
        console.warn('Error loading Google Maps API:', error);
        loadPromise = null;
        reject(error);
      }
    } catch (error) {
      loadPromise = null;
      reject(error);
    }
  });

  return loadPromise;
}

/**
 * Check if Google Maps API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return isLoaded || (window.google && window.google.maps);
}

/**
 * Generate Google Maps directions URL for a given latitude and longitude
 * @param lat - Latitude of the destination
 * @param lng - Longitude of the destination
 * @param name - Optional name for the destination
 * @returns URL string for Google Maps directions
 */
export function getGoogleMapsDirectionsUrl(lat: number, lng: number, name?: string): string {
  if (isNaN(lat) || isNaN(lng)) {
    return '#';
  }
  
  let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  
  if (name) {
    url += `&destination_place_id=${encodeURIComponent(name)}`;
  }
  
  return url;
}

/**
 * Generate Google Maps search URL for a given latitude and longitude
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param name - Optional name for the location
 * @returns URL string for Google Maps search
 */
export function getGoogleMapsSearchUrl(lat: number, lng: number, name?: string): string {
  if (isNaN(lat) || isNaN(lng)) {
    return '#';
  }
  
  let url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  
  if (name) {
    url += `&query_place_id=${encodeURIComponent(name)}`;
  }
  
  return url;
}

/**
 * Open a Google Maps URL in a new tab
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param mode - 'directions' or 'search'
 * @param name - Optional name for the location
 */
export function openInGoogleMaps(lat: number, lng: number, mode: 'directions' | 'search' = 'directions', name?: string): void {
  if (isNaN(lat) || isNaN(lng)) {
    return;
  }
  
  const url = mode === 'directions' 
    ? getGoogleMapsDirectionsUrl(lat, lng, name)
    : getGoogleMapsSearchUrl(lat, lng, name);
  
  window.open(url, '_blank');
}

// Add Google Maps to Window type
declare global {
  interface Window {
    google?: any;
  }
}

export default {
  loadGoogleMapsApi,
  isGoogleMapsLoaded,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl,
  openInGoogleMaps
}; 