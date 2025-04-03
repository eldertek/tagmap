import { ref } from 'vue';
import type { Map as LeafletMap } from 'leaflet';
import * as L from 'leaflet';
import { performanceMonitor, usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

export function useMapState() {
  const { isEnabled, startMeasure } = usePerformanceMonitor();

  const map = ref<LeafletMap | null>(null);
  const searchQuery = ref('');
  const currentBaseMap = ref('Hybride');
  const activeLayer = ref<any>(null);

  // Mesurer les performances de la création des baseMaps
  const endBaseMapsCreation = startMeasure('createBaseMaps', 'useMapState');
  const baseMaps = {
    'Hybride': L.layerGroup([
      L.tileLayer('/osm_tiles/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
        noWrap: true,
        keepBuffer: 4,
        maxNativeZoom: 19,
        tileSize: 256,
        zoomOffset: 0,
        bounds: L.latLngBounds(L.latLng(41.333, -5.566), L.latLng(51.089, 9.555)),
        crossOrigin: true,
        detectRetina: true,
        opacity: 0.6
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
        noWrap: true,
        keepBuffer: 4,
        maxNativeZoom: 20,
        tileSize: 256,
        zoomOffset: 0,
        bounds: L.latLngBounds(L.latLng(41.333, -5.566), L.latLng(51.089, 9.555)),
        crossOrigin: true,
        detectRetina: true,
        opacity: 0.6
      })
    ]),
    'Cadastre': L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
      attribution: 'Cadastre - Carte © IGN/Geoportail',
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      noWrap: true,
      keepBuffer: 4,
      maxNativeZoom: 18,
      tileSize: 256,
      zoomOffset: 0,
      bounds: L.latLngBounds(L.latLng(41.333, -5.566), L.latLng(51.089, 9.555)),
      crossOrigin: true,
      detectRetina: true
    }),
    'IGN': L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
      attribution: 'Carte IGN © IGN/Geoportail',
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      noWrap: true,
      keepBuffer: 4,
      maxNativeZoom: 18,
      tileSize: 256,
      zoomOffset: 0,
      bounds: L.latLngBounds(L.latLng(41.333, -5.566), L.latLng(51.089, 9.555)),
      crossOrigin: true,
      detectRetina: true
    })
  };
  endBaseMapsCreation();

  const initMap = performanceMonitor.createPerformanceTracker(
    (mapInstance: LeafletMap) => {
      performanceMonitor.measure('initMap:setOptions', () => {
        map.value = mapInstance;
        // Optimisation du zoom
        mapInstance.options.zoomSnap = 0.25;
        mapInstance.options.zoomDelta = 0.25;
        mapInstance.options.wheelPxPerZoomLevel = 100;
        mapInstance.options.zoomAnimation = true;
        mapInstance.options.fadeAnimation = true;
        mapInstance.options.markerZoomAnimation = true;
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
        let isZooming = false; // Used in zoomend event
        let lastZoomLevel = mapInstance.getZoom();

        mapInstance.on('zoomstart', () => {
          isZooming = true;
          lastZoomLevel = mapInstance.getZoom();
          // Désactiver les animations pendant le zoom pour améliorer les performances
          mapInstance.options.zoomAnimation = false;
          mapInstance.options.markerZoomAnimation = false;
        });

        mapInstance.on('zoomend', () => {
          if (zoomTimeout) {
            clearTimeout(zoomTimeout);
          }

          zoomTimeout = setTimeout(() => {
            isZooming = false;
            // Réactiver les animations progressivement
            setTimeout(() => {
              mapInstance.options.zoomAnimation = true;
              mapInstance.options.markerZoomAnimation = true;
              // Forcer un rafraîchissement de la vue
              mapInstance.invalidateSize({ animate: false, pan: false });
              // Vérifier et ajuster les limites si nécessaire
              const currentBounds = mapInstance.getBounds();
              const maxBounds = mapInstance.options.maxBounds;
              if (maxBounds && !currentBounds.intersects(maxBounds)) {
                mapInstance.panInsideBounds(maxBounds, { animate: false });
              }
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
      }, 'useMapState');

      // Ajouter la couche initiale
      performanceMonitor.measure('initMap:addInitialLayer', () => {
        if (!mapInstance) return;

        // S'assurer que la carte est prête
        mapInstance.whenReady(() => {
          const baseMapKey = currentBaseMap.value as keyof typeof baseMaps;
          if (baseMaps[baseMapKey]) {
            console.log(`Initialisation de la couche de base: ${baseMapKey}`);
            // Vérifier si une couche est déjà active
            if (activeLayer.value && mapInstance.hasLayer(activeLayer.value)) {
              try {
                mapInstance.removeLayer(activeLayer.value);
                console.log('Couche active précédente supprimée');
              } catch (e) {
                console.warn('Erreur lors de la suppression de la couche active précédente:', e);
              }
            }
            
            activeLayer.value = baseMaps[baseMapKey];
            try {
              activeLayer.value.addTo(mapInstance as any);
              console.log(`Couche ${baseMapKey} ajoutée à la carte`);
            } catch (e) {
              console.error(`Erreur lors de l'ajout de la couche ${baseMapKey}:`, e);
            }
          } else {
            console.warn(`Couche de base non disponible: ${baseMapKey}`);
          }
        });
      }, 'useMapState');

      // Gérer les changements de couche de base via l'événement natif
      mapInstance.on('baselayerchange', (e: any) => {
        const endLayerChange = startMeasure('baselayerchange', 'useMapState', { layer: e.name });
        currentBaseMap.value = e.name;
        activeLayer.value = e.layer;
        endLayerChange();
      });

      // Ajouter des moniteurs de performance pour les événements de carte
      if (isEnabled.value) {
        mapInstance.on('movestart', () => {
          startMeasure('mapMove', 'useMapState', {
            startCenter: mapInstance.getCenter()
          });
        });

        mapInstance.on('moveend', () => {
          const endMove = startMeasure('mapMoveEnd', 'useMapState', {
            endCenter: mapInstance.getCenter()
          });
          endMove();
        });

        // Monitorer le chargement des tuiles
        mapInstance.on('tileloadstart', () => {
          startMeasure('tileLoad', 'useMapState');
        });

        mapInstance.on('tileload', () => {
          const endTileLoad = startMeasure('tileLoadEnd', 'useMapState');
          endTileLoad();
        });
      }
    },
    'initMap',
    'useMapState'
  );

  // Implémentation simplifiée et robuste du changement de carte de base
  const changeBaseMap = performanceMonitor.createAsyncPerformanceTracker(
    async (baseMapName: keyof typeof baseMaps) => {
      if (!map.value || !baseMaps[baseMapName]) {
        console.warn(`Impossible de changer la carte de base: ${!map.value ? 'carte non initialisée' : 'type de carte non disponible'}`);
        return;
      }

      try {
        // Vérifier si la couche demandée est déjà active
        if (currentBaseMap.value === baseMapName) return;

        console.log(`Changement de carte: ${currentBaseMap.value} -> ${baseMapName}`);
        
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
            console.log(`Couche précédente ${currentBaseMap.value} supprimée`);
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
          console.log(`Nouvelle couche ${baseMapName} ajoutée`);
        } catch (e) {
          console.error('Erreur lors de l\'ajout de la nouvelle couche:', e);
          // Tentative de récupération
          try {
            if (mapInstance.hasLayer(newLayer)) {
              mapInstance.removeLayer(newLayer);
            }
            newLayer.addTo(mapInstance as any);
            console.log(`Récupération: couche ${baseMapName} réajoutée`);
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
          console.log(`Vue réinitialisée: centre=${currentCenter}, zoom=${currentZoom}`);
        } catch (e) {
          console.warn('Erreur lors de la réinitialisation de la vue:', e);
        }
        
        // Forcer un rafraîchissement de la carte
        try {
          mapInstance.invalidateSize({ animate: false, pan: false });
        } catch (e) {
          console.warn('Erreur lors du rafraîchissement de la carte:', e);
        }
        
        // Restaurer les animations après un court délai
        setTimeout(() => {
          mapInstance.options.zoomAnimation = true;
          mapInstance.options.fadeAnimation = true;
          mapInstance.options.markerZoomAnimation = true;
          console.log('Animations restaurées');
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
            
            console.log('Récupération effectuée après erreur');
          } catch (e) {
            console.error('Erreur lors de la récupération après échec:', e);
          }
        }
      }
    },
    'changeBaseMap',
    'useMapState'
  );

  const searchLocation = performanceMonitor.createAsyncPerformanceTracker(
    async () => {
      if (!map.value || !searchQuery.value) return;
      try {
        const response = await performanceMonitor.measureAsync('searchLocation:fetchData', async () => {
          return await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}`
          );
        }, 'useMapState');

        const data = await performanceMonitor.measureAsync('searchLocation:parseResponse', async () => {
          return await response.json();
        }, 'useMapState');

        if (data && data.length > 0) {
          performanceMonitor.measure('searchLocation:updateView', () => {
            const { lat, lon } = data[0];
            map.value!.setView([lat, lon], 13, { animate: currentBaseMap.value !== 'Cadastre' });
          }, 'useMapState');
        }
      } catch (error) {
        console.error('Erreur lors de la recherche de localisation:', error);
      }
    },
    'searchLocation',
    'useMapState'
  );

  // Fonction de nettoyage des ressources avec monitoring de performance
  const cleanup = () => {
    const endCleanup = startMeasure('cleanup', 'useMapState');
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
    if (activeLayer.value) {
      activeLayer.value = null;
    }
    endCleanup();
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
    // Exposer les métriques de performance
    isPerformanceEnabled: isEnabled
  };
}
