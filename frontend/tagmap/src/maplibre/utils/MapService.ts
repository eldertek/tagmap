import maplibregl from 'maplibre-gl';
import { settingsService } from '@/services/api';

/**
 * Interface pour la requête de création de session Google
 */
interface GoogleSessionRequest {
  mapType: string;
  language: string;
  region: string;
  scale: string;
  highDpi: boolean;
  layerTypes?: string[];
  overlay?: boolean;
}

/**
 * Implémentation personnalisée du protocole Google Maps
 */
const sessions: Record<string, any> = {};

export async function googleProtocol(params: any, abortController?: AbortController) {
  const url = new URL(params.url.replace('google://', 'https://'));
  const sessionKey = `${url.hostname}?${url.searchParams}`;
  const key = url.searchParams.get('key');

  if (!key) {
    console.error('Clé API Google Maps manquante dans l\'URL');
    throw new Error('Clé API Google Maps manquante');
  }

  let value = sessions[sessionKey];
  if (!value) {
    value = new Promise(async (resolve, reject) => {
      try {
        const mapType = url.hostname;
        // Les mapTypes valides sont "roadmap", "satellite" et "terrain"
        // "hybrid" n'est pas un mapType valide, mais une combinaison de "satellite" avec "layerRoadmap"
        
        // Configuration de la requête de session
        const sessionRequest: GoogleSessionRequest = {
          mapType: "satellite", // Toujours utiliser satellite comme base
          language: "fr-FR",
          region: "FR",
          scale: "scaleFactor2x",
          highDpi: true,
          layerTypes: ["layerRoadmap"], // Ajoute la couche de routes par défaut pour un effet "hybrid"
        };
        
        // Si l'URL contient des paramètres spécifiques, les utiliser
        const layerType = url.searchParams.get('layerType');
        if (layerType) {
          sessionRequest.layerTypes = [layerType];
        }
        
        const overlay = url.searchParams.get('overlay');
        if (overlay) {
          sessionRequest.overlay = overlay === 'true';
        }

        console.log('Requête de session Google Maps:', JSON.stringify(sessionRequest, null, 2));

        const response = await fetch(`https://tile.googleapis.com/v1/createSession?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionRequest),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorText = errorData ? JSON.stringify(errorData, null, 2) : await response.text();
          console.error('Erreur lors de la création de session Google Maps:', errorText);
          reject(new Error(`Échec de la création de session: ${response.status} ${response.statusText}`));
          return;
        }

        const result = await response.json();
        
        if (!result.session) {
          console.error('Réponse de session invalide:', result);
          reject(new Error('Session invalide retournée par l\'API Google Maps'));
          return;
        }
        
        sessions[sessionKey] = result.session;
        resolve(result.session);
      } catch (error) {
        console.error('Erreur lors de la création de session:', error);
        reject(error);
      }
    });
    
    sessions[sessionKey] = value;
    try {
      await value;
    } catch (error) {
      console.error('Échec de la création de session Google Maps:', error);
      throw error;
    }
  } else if (value instanceof Promise) {
    try {
      await value;
    } catch (error) {
      console.error('Échec lors de l\'attente de la session:', error);
      throw error;
    }
  }

  const session = sessions[sessionKey];
  
  try {
    const tileUrl = `https://tile.googleapis.com/v1/2dtiles${url.pathname}?session=${session}&key=${key}`;
    const tileResponse = await fetch(tileUrl);
    
    if (!tileResponse.ok) {
      throw new Error(`Échec de récupération de tuile: ${tileResponse.status} ${tileResponse.statusText}`);
    }
    
    const data = await tileResponse.arrayBuffer();
    return { data };
  } catch (error) {
    console.error('Erreur lors de la récupération de la tuile:', error);
    throw error;
  }
}

export function createGoogleStyle(id: string, mapType: string, key: string) {
  // Pour le style "hybrid", nous utilisons toujours "satellite" comme mapType
  // car "hybrid" n'est pas un mapType valide pour l'API Google
  const actualMapType = mapType === 'hybrid' ? 'satellite' : mapType;
  
  // Ajouter le paramètre layerType pour les cartes hybrides
  const layerTypeParam = mapType === 'hybrid' ? '&layerType=layerRoadmap' : '';
  
  const style = {
    "version": 8,
    "sources": {
      [id]: {
        "type": "raster",
        "tiles": [`google://${actualMapType}/{z}/{x}/{y}?key=${key}${layerTypeParam}`],
        "tileSize": 256,
        "attribution": "&copy; Google Maps",
        "maxzoom": 19,
      }
    },
    "layers": [
      {
        "id": id,
        "type": "raster",
        "source": id,
      },
    ],
  };
  return style;
}

/**
 * Service pour la gestion des cartes MapLibre
 * Fournit des fonctions utilitaires pour les cartes
 */
export class MapService {
  private _googleApiKey: string | null = null;
  private _googleProtocolRegistered = false;

  /**
   * Initialise le service de carte
   */
  constructor() {
    // Initialiser le service au besoin
  }

  /**
   * Récupère la clé API Google Maps depuis le backend
   */
  async getGoogleMapsApiKey(): Promise<string | null> {
    if (this._googleApiKey) {
      return this._googleApiKey;
    }

    try {
      const response = await settingsService.getGoogleMapsApiKey();
      if (response.data && response.data.key_status === 'configured') {
        // Extraire la clé API à partir de l'URL
        const url = new URL(response.data.url);
        this._googleApiKey = url.searchParams.get('key');
        return this._googleApiKey;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la clé Google Maps:', error);
    }
    return null;
  }

  /**
   * Enregistre le protocole Google Maps si ce n'est pas déjà fait
   */
  registerGoogleProtocol(): void {
    if (!this._googleProtocolRegistered) {
      try {
        maplibregl.addProtocol('google', googleProtocol);
        this._googleProtocolRegistered = true;
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du protocole Google Maps:', error);
      }
    }
  }

  /**
   * Crée un style pour une carte Google Maps
   * @param sourceId Identifiant de la source (par défaut: 'google-source')
   * @param mapType Type de carte ('roadmap', 'satellite' ou 'hybrid')
   * @param withCadastre Ajoute une couche cadastrale par dessus (uniquement pour roadmap)
   * @returns Style compatible avec MapLibre
   */
  async createGoogleMapStyle(sourceId = 'google', mapType = 'hybrid', withCadastre = false): Promise<any> {
    const apiKey = await this.getGoogleMapsApiKey();
    if (!apiKey) {
      throw new Error('Clé API Google Maps non configurée');
    }

    this.registerGoogleProtocol();
    
    // Création du style Google Maps en utilisant notre fonction personnalisée
    const style = createGoogleStyle(sourceId, mapType, apiKey);
    
    // Si withCadastre est true et qu'on est en mode roadmap, ajouter la couche cadastrale
    if (withCadastre && mapType === 'roadmap') {
      // Ajouter la source cadastrale
      style.sources['cadastre-overlay'] = this.standardTileSources.cadastre;
      
      // Ajouter la couche cadastrale au-dessus de la carte Google
      style.layers.push({
        id: 'cadastre-overlay',
        type: 'raster',
        source: 'cadastre-overlay',
        minzoom: 0,
        maxZoom: 17
      });
    }
    
    return style;
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
        attribution: 'Carte IGN © IGN/Geoportail',
        maxZoom: 17
      },
      cadastre: {
        type: 'raster',
        tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'],
        tileSize: 256,
        attribution: 'Cadastre - Carte © IGN/Geoportail',
        maxZoom: 17
      }
    };
  }

  /**
   * Crée un transformRequest pour ajouter l'authentification aux requêtes de tuiles
   * @returns Fonction transformRequest pour MapLibre
   */
  getTransformRequest(): any {
    return (url: string, resourceType: string) => {
      // Pour les requêtes vers Google Maps, aucune authentification n'est requise
      // car la clé API est déjà dans l'URL via le protocole
      
      // Pour les autres ressources, ne pas modifier la requête
      return { url };
    };
  }

  /**
   * Crée un style de carte standard avec une source de tuiles
   * @param source Source de tuiles (ign, cadastre)
   * @returns Style compatible avec MapLibre
   */
  createStandardMapStyle(source: 'ign' | 'cadastre'): any {
    return {
      version: 8,
      sources: {
        'base-tiles': this.standardTileSources[source]
      },
      layers: [
        {
          id: 'base-tiles',
          type: 'raster',
          source: 'base-tiles',
          minzoom: 0,
          maxZoom: 17
        }
      ]
    };
  }
}

// Créer et exporter une instance unique du service
export const mapService = new MapService(); 