import mapConfig from '@/config/maps.config';

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

  loadPromise = new Promise<void>((resolve, reject) => {
    try {
      // Check if already loaded
      if (window.google && window.google.maps) {
        isLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapConfig.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Setup handlers
      script.onload = () => {
        isLoaded = true;
        resolve();
      };

      script.onerror = (error) => {
        loadPromise = null;
        reject(new Error(`Failed to load Google Maps API: ${error}`));
      };

      // Add to document
      document.head.appendChild(script);
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