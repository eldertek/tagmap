import { ref } from 'vue';
import type { Map as LeafletMap } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet.gridlayer.googlemutant';
import { loadGoogleMapsApi } from '@/utils/googleMapsLoader';

export function useMapState() {
  const map = ref<LeafletMap | null>(null);
  const searchQuery = ref('');
  const currentBaseMap = ref('Hybride');
  const activeLayer = ref<any>(null);
  const isGoogleMapsLoaded = ref(false);

  // Configuration commune pour toutes les couches de base
  const commonTileOptions = {
    maxZoom: 19,
    updateWhenZooming: true, // Mettre à jour les tuiles pendant le zoom pour une expérience plus fluide
    updateWhenIdle: true,
    noWrap: true,
    keepBuffer: 2, // Réduire le buffer pour économiser de la mémoire
    maxNativeZoom: 19,
    tileSize: 256,
    zoomOffset: 0,
    bounds: L.latLngBounds(L.latLng(41.333, -5.566), L.latLng(51.089, 9.555)),
    crossOrigin: true,
    detectRetina: true,
    // Ajouter des options de mise en cache
    useCache: true,
    // Réduire la priorité de chargement des tuiles hors écran
    priorityLevels: 3
  };

  const baseMaps = {
    'Hybride': L.layerGroup([
      (L.gridLayer as any).googleMutant({
        type: 'hybrid',           // satellite + labels
        maxZoom: commonTileOptions.maxZoom ?? 20
      })
    ]),
    'Cadastre': L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
      ...commonTileOptions,
      attribution: 'Cadastre - Carte © IGN/Geoportail',
      maxNativeZoom: 18
    }),
    'IGN': L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
      ...commonTileOptions,
      attribution: 'Carte IGN © IGN/Geoportail',
      maxNativeZoom: 18
    })
  };

  // Ensure Google Maps API is loaded before initializing the map
  const loadGoogleMaps = async () => {
    try {
      await loadGoogleMapsApi();
      isGoogleMapsLoaded.value = true;
    } catch (error) {
      console.error('Failed to load Google Maps API:', error);
      // Fallback to non-Google layers if Google Maps fails to load
      isGoogleMapsLoaded.value = false;
      // Switch to a different base map if Hybride is selected
      if (currentBaseMap.value === 'Hybride') {
        currentBaseMap.value = 'IGN';
      }
    }
  };

  // Modified initMap to ensure Google Maps is loaded first
  const initMap = async (mapInstance: LeafletMap) => {
    // Load Google Maps if not already loaded
    if (!isGoogleMapsLoaded.value) {
      await loadGoogleMaps();
    }

    map.value = mapInstance;
    // Optimisation du zoom
    mapInstance.options.zoomSnap = 0.5; // Augmenter pour réduire les calculs intermédiaires
    mapInstance.options.zoomDelta = 0.5; // Augmenter pour réduire les calculs intermédiaires
    mapInstance.options.wheelPxPerZoomLevel = 120; // Augmenter pour réduire la sensibilité
    mapInstance.options.zoomAnimation = true;
    mapInstance.options.fadeAnimation = true;
    mapInstance.options.markerZoomAnimation = true;
    // Optimisations supplémentaires
    mapInstance.options.preferCanvas = true; // Utiliser Canvas au lieu de SVG pour le rendu
    mapInstance.options.renderer = L.canvas(); // Forcer l'utilisation du renderer Canvas
    // Limites de zoom et de vue
    mapInstance.options.minZoom = 2;
    mapInstance.options.maxZoom = 19;
    mapInstance.options.scrollWheelZoom = true;
    mapInstance.options.doubleClickZoom = true;

    const maxBounds: L.LatLngBounds = L.latLngBounds(
      L.latLng(-90, -180),  // Sud-Ouest
      L.latLng(90, 180)     // Nord-Est
    );
    mapInstance.setMaxBounds(maxBounds);
    mapInstance.options.maxBoundsViscosity = 1.0;
    mapInstance.options.trackResize = true;

    // Gestionnaire d'événements pour les zooms rapides
    let zoomTimeout: NodeJS.Timeout | null = null;
    let lastZoomLevel = mapInstance.getZoom();

    mapInstance.on('zoomstart', () => {
      lastZoomLevel = mapInstance.getZoom();
      mapInstance.options.zoomAnimation = false;
      mapInstance.options.markerZoomAnimation = false;
    });

    mapInstance.on('zoomend', () => {
      if (zoomTimeout) {
        clearTimeout(zoomTimeout);
      }

      zoomTimeout = setTimeout(() => {
        setTimeout(() => {
          mapInstance.options.zoomAnimation = true;
          mapInstance.options.markerZoomAnimation = true;
          mapInstance.invalidateSize({ animate: false, pan: false });
          
          const currentBounds = mapInstance.getBounds();
          const maxBounds = mapInstance.options.maxBounds;
          if (maxBounds && !currentBounds.intersects(maxBounds)) {
            mapInstance.panInsideBounds(maxBounds, { animate: false });
          }

          mapInstance.eachLayer((layer: any) => {
            if (layer.properties && layer.properties.type === 'Note' && typeof layer.updatePosition === 'function') {
              layer.updatePosition();
            }
          });
        }, 250);
      }, 250);
    });

    // Intercepter les erreurs d'animation
    const originalZoomAnimation = (mapInstance as any)._zoomAnimation;
    if (originalZoomAnimation) {
      (mapInstance as any)._zoomAnimation = function (e: any) {
        try {
          if (!this._animatingZoom) {
            originalZoomAnimation.call(this, e);
          }
        } catch (error) {
          console.warn('Animation de zoom interrompue, restauration de la vue...');
          this._resetView(this.getCenter(), this.getZoom());
        }
      };
    }

    // Ajouter un gestionnaire d'événement spécifique pour l'animation de zoom
    // qui mettra à jour correctement les positions des GeoNotes
    mapInstance.on('zoomanim', (e: any) => {
      mapInstance.eachLayer((layer: any) => {
        if (layer.properties && layer.properties.type === 'Note' && typeof layer.updatePositionDuringZoom === 'function') {
          layer.updatePositionDuringZoom(e);
        }
      });
    });

    // Ajouter la couche initiale
    if (!mapInstance) return;

    // S'assurer que la carte est prête
    mapInstance.whenReady(() => {
      const baseMapKey = currentBaseMap.value as keyof typeof baseMaps;
      if (baseMaps[baseMapKey]) {
        // Vérifier si une couche est déjà active
        if (activeLayer.value && mapInstance.hasLayer(activeLayer.value)) {
          try {
            mapInstance.removeLayer(activeLayer.value);
          } catch (e) {
            console.warn('Erreur lors de la suppression de la couche active précédente:', e);
          }
        }

        activeLayer.value = baseMaps[baseMapKey];
        try {
          activeLayer.value.addTo(mapInstance as any);
        } catch (e) {
          console.error(`Erreur lors de l'ajout de la couche ${baseMapKey}:`, e);
        }
      } else {
        console.warn(`Couche de base non disponible: ${baseMapKey}`);
      }
    });

    // Gérer les changements de couche de base via l'événement natif
    mapInstance.on('baselayerchange', (e: any) => {
      currentBaseMap.value = e.name;
      activeLayer.value = e.layer;
    });
  };

  // Update changeBaseMap to ensure Google Maps is loaded when switching to Hybride
  const changeBaseMap = async (baseMapName: keyof typeof baseMaps) => {
    // Load Google Maps if switching to Hybride and not already loaded
    if (baseMapName === 'Hybride' && !isGoogleMapsLoaded.value) {
      await loadGoogleMaps();
      // If Google Maps failed to load, abort switching to Hybride
      if (!isGoogleMapsLoaded.value) {
        console.warn('Cannot switch to Hybride: Google Maps API not loaded');
        return;
      }
    }

    if (!map.value || !baseMaps[baseMapName]) {
      console.warn(`Impossible de changer la carte de base: ${!map.value ? 'carte non initialisée' : 'type de carte non disponible'}`);
      return;
    }

    try {
      // Vérifier si la couche demandée est déjà active
      if (currentBaseMap.value === baseMapName) return;


      // Récupérer l'instance de carte et la position actuelle
      const mapInstance = map.value;
      const currentCenter = mapInstance.getCenter();
      const currentZoom = mapInstance.getZoom();

      // Désactiver temporairement les animations
      mapInstance.options.zoomAnimation = false;
      mapInstance.options.fadeAnimation = false;
      mapInstance.options.markerZoomAnimation = false;

      // Récupérer la nouvelle couche
      const newLayer = baseMaps[baseMapName];

      // Supprimer la couche active actuelle si elle existe
      if (activeLayer.value && mapInstance.hasLayer(activeLayer.value)) {
        try {
          mapInstance.removeLayer(activeLayer.value);
        } catch (e) {
          console.warn('Erreur lors de la suppression de la couche active:', e);
        }
      }

      // Ajouter la nouvelle couche
      try {
        if (newLayer instanceof L.LayerGroup) {
          newLayer.addTo(mapInstance as any);
        } else {
          newLayer.addTo(mapInstance as any);
        }
      } catch (e) {
        console.error('Erreur lors de l\'ajout de la nouvelle couche:', e);
        // Tentative de récupération
        try {
          if (mapInstance.hasLayer(newLayer)) {
            mapInstance.removeLayer(newLayer);
          }
          newLayer.addTo(mapInstance as any);
        } catch (recoveryError) {
          console.error('Échec de la récupération:', recoveryError);
          throw new Error('Impossible d\'ajouter la nouvelle couche');
        }
      }

      // Mettre à jour les références
      activeLayer.value = newLayer;
      currentBaseMap.value = baseMapName;

      // Réinitialiser la vue
      try {
        mapInstance.setView(currentCenter, currentZoom, {
          animate: false,
          duration: 0,
          noMoveStart: true
        });
      } catch (e) {
        console.warn('Erreur lors de la réinitialisation de la vue:', e);
      }

      // Forcer un rafraîchissement de la carte
      try {
        mapInstance.invalidateSize({ animate: false, pan: false });

        // Mettre à jour la position de tous les GeoNotes
        setTimeout(() => {
          mapInstance.eachLayer((layer: any) => {
            if (layer.properties && layer.properties.type === 'Note' && typeof layer.updatePosition === 'function') {
              layer.updatePosition();
            }
          });
        }, 100);
      } catch (e) {
        console.warn('Erreur lors du rafraîchissement de la carte:', e);
      }

      // Restaurer les animations après un court délai
      setTimeout(() => {
        mapInstance.options.zoomAnimation = true;
        mapInstance.options.fadeAnimation = true;
        mapInstance.options.markerZoomAnimation = true;
      }, 500);
    } catch (error) {
      console.error('Erreur lors du changement de carte de base:', error);
      // En cas d'erreur, essayer de restaurer un état stable
      if (map.value) {
        try {
          const mapInstance = map.value;

          // Supprimer toutes les couches de tuiles
          mapInstance.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer || layer instanceof L.LayerGroup) {
              mapInstance.removeLayer(layer);
            }
          });

          // Ajouter la couche demandée
          const newLayer = baseMaps[baseMapName];
          newLayer.addTo(mapInstance as any);

          // Mettre à jour les références
          activeLayer.value = newLayer;
          currentBaseMap.value = baseMapName;

          // Restaurer les animations
          mapInstance.options.zoomAnimation = true;
          mapInstance.options.fadeAnimation = true;
          mapInstance.options.markerZoomAnimation = true;
          mapInstance.invalidateSize({ animate: false, pan: false });
        } catch (e) {
          console.error('Erreur lors de la récupération après échec:', e);
        }
      }
    }
  };

  const searchLocation = async () => {
    if (!map.value || !searchQuery.value) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}`
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.value!.setView([lat, lon], 13, { animate: true });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de localisation:', error);
    }
  };

  // Fonction de nettoyage des ressources
  const cleanup = () => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
    if (activeLayer.value) {
      activeLayer.value = null;
    }
  };

  return {
    map,
    searchQuery,
    currentBaseMap,
    baseMaps,
    initMap,
    searchLocation,
    changeBaseMap,
    cleanup,
    // Expose Google Maps loading state
    isGoogleMapsLoaded
  };
}
