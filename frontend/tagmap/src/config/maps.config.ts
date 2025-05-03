/**
 * Configuration for map services
 */

export const mapConfig = {
  /**
   * Default map settings
   */
  defaults: {
    center: [46.603354, 1.888334], // Center of France
    zoom: 6,
    minZoom: 2,
    maxZoom: 19,
    googleMapsApiKey: '' // Clé par défaut, utilisée comme fallback uniquement
  }
};

export default mapConfig; 