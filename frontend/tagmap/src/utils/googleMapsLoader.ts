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
        script.src = googleMapsURL;
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

// Add Google Maps to Window type
declare global {
  interface Window {
    google?: any;
  }
}

export default {
  loadGoogleMapsApi,
  isGoogleMapsLoaded
}; 