import { googleStyleToCadastralJSON } from './mapUtils'

/**
 * Service for map-related operations in MapLibre GL
 */
export class MapService {
  private _googleProtocolRegistered = false;

  /**
   * Gets a transform request function for MapLibre to handle custom sources
   */
  getTransformRequest() {
    return (url: string, resourceType: string) => {
      // Handle URL transformations to properly load Google Maps tiles
      if (url.includes('google') && resourceType === 'Tile') {
        // For Google Maps tiles, don't send custom headers to avoid CORS issues
        return {
          url: url
        }
      }
      return { url }
    }
  }

  /**
   * Creates a style object for Google Maps base layer
   * @param providerKey Provider key (google)
   * @param mapType Map type (hybrid, roadmap, satellite, terrain)
   * @param showCadastre Whether to show cadastre layer
   */
  async createGoogleMapStyle(providerKey: string, mapType: string, showCadastre: boolean) {
    // Create a base style for Google Maps
    const style = {
      version: 8,
      sources: {
        'google-maps': {
          type: 'raster',
          tiles: [
            `https://mt1.google.com/vt/lyrs=${this.getGoogleMapTypeParam(mapType)}&x={x}&y={y}&z={z}`
          ],
          tileSize: 256,
          attribution: '' // Empty attribution
        }
      },
      layers: [
        {
          id: 'google-layer',
          type: 'raster',
          source: 'google-maps',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }

    // Add cadastre layer if requested
    if (showCadastre) {
      // Clone the style for modification
      const styleWithCadastre = JSON.parse(JSON.stringify(style))
      
      try {
        // Get cadastre style and add to the base style
        const cadastreStyle = await googleStyleToCadastralJSON()
        
        // Add cadastre source
        styleWithCadastre.sources.cadastre = {
          type: 'raster',
          tiles: [
            'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
          ],
          tileSize: 256,
          minzoom: 10,
          maxzoom: 18,
          attribution: '' // Empty attribution
        }
        
        // Add cadastre layers
        if (cadastreStyle && cadastreStyle.layers) {
          styleWithCadastre.layers = [...styleWithCadastre.layers, ...cadastreStyle.layers]
        }
        
        return styleWithCadastre
      } catch (error) {
        console.error('Failed to add cadastre layer, returning base style', error)
        return style
      }
    }
    
    return style
  }

  /**
   * Gets the Google Maps tile parameter for the given map type
   */
  getGoogleMapTypeParam(mapType: string): string {
    switch (mapType.toLowerCase()) {
      case 'hybrid':
        return 'y'
      case 'satellite':
        return 's'
      case 'terrain':
        return 'p'
      case 'roadmap':
      default:
        return 'm'
    }
  }

  /**
   * Sources de tuiles standard pour les cartes françaises
   */
  get standardTileSources() {
    return {
      ign: {
        type: 'raster',
        tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'],
        tileSize: 256,
        attribution: '', // Empty attribution
        maxZoom: 17
      },
      cadastre: {
        type: 'raster',
        tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'],
        tileSize: 256,
        attribution: '', // Empty attribution
        maxZoom: 17
      }
    };
  }

  /**
   * Creates a standard map style for non-Google providers
   * @param provider The provider (ign, osm)
   */
  createStandardMapStyle(provider: string) {
    if (provider === 'ign') {
      // IGN (Institut National de l'Information Géographique et Forestière) style
      return {
        version: 8,
        sources: {
          'ign-maps': this.standardTileSources.ign
        },
        layers: [
          {
            id: 'ign-layer',
            type: 'raster',
            source: 'ign-maps',
            minzoom: 0,
            maxzoom: 18
          }
        ]
      }
    } else if (provider === 'cadastre') {
      return {
        version: 8,
        sources: {
          'cadastre-maps': this.standardTileSources.cadastre
        },
        layers: [
          {
            id: 'cadastre-layer',
            type: 'raster',
            source: 'cadastre-maps',
            minzoom: 0,
            maxzoom: 18
          }
        ]
      }
    }
    
    // Default to OpenStreetMap
    return {
      version: 8,
      sources: {
        'osm-maps': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '' // Empty attribution
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-maps',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  }
}

// Create a singleton instance
export const mapService = new MapService()