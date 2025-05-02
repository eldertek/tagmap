/**
 * Configuration for map services
 */

export const mapConfig = {
  /**
   * Google Maps API Key
   * Replace this with your actual Google Maps API key
   */
  googleMapsApiKey: 'AIzaSyCQyGM6ndsRr6Jro1FK07a8BFBP-7lhzwM',

  /**
   * Default map settings
   */
  defaults: {
    center: [46.603354, 1.888334], // Center of France
    zoom: 6,
    minZoom: 2,
    maxZoom: 19
  }
};

export default mapConfig; 