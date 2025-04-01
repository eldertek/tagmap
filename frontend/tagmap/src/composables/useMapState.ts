import { ref } from 'vue';
import type { Map as LeafletMap } from 'leaflet';
import * as L from 'leaflet';
import { performanceMonitor, usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

export function useMapState() {
  const { isEnabled, startMeasure } = usePerformanceMonitor();
  
  const map = ref<LeafletMap | null>(null);
  const searchQuery = ref('');
  const currentBaseMap = ref('Ville');
  const activeLayer = ref<any>(null);
  
  // Mesurer les performances de la création des baseMaps
  const endBaseMapsCreation = startMeasure('createBaseMaps', 'useMapState');
  const baseMaps = {
    'Ville': L.tileLayer('/osm_tiles/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
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
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
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
        // Optimisations supplémentaires
        mapInstance.options.trackResize = true;
        
        // Gestionnaire d'événements pour les zooms rapides
        let zoomTimeout: NodeJS.Timeout | null = null;
        let isZooming = false;
        let lastZoomLevel = mapInstance.getZoom();

        mapInstance.on('zoomstart', () => {
          isZooming = true;
          if (zoomTimeout) {
            clearTimeout(zoomTimeout);
          }
          
          // Désactiver temporairement les animations pendant le zoom
          mapInstance.options.zoomAnimation = false;
          mapInstance.options.markerZoomAnimation = false;
          
          // Sauvegarder le niveau de zoom actuel
          lastZoomLevel = mapInstance.getZoom();
        });

        mapInstance.on('zoom', () => {
          const currentZoom = mapInstance.getZoom();
          // Détecter un dézoom rapide
          if (currentZoom < lastZoomLevel - 2) {
            // Forcer un rafraîchissement immédiat pour éviter les artefacts
            mapInstance.invalidateSize({ animate: false, pan: false });
          }
          lastZoomLevel = currentZoom;
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
          (mapInstance as any)._zoomAnimation = function(e: any) {
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
        activeLayer.value = baseMaps[currentBaseMap.value as keyof typeof baseMaps];
        activeLayer.value.addTo(mapInstance);
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

  const changeBaseMap = performanceMonitor.createAsyncPerformanceTracker(
    async (baseMapName: keyof typeof baseMaps) => {
      if (!map.value || !baseMaps[baseMapName]) return;
      
      try {
        // Vérifier si la couche demandée est déjà active
        if (currentBaseMap.value === baseMapName) return;

        // Désactiver toutes les animations temporairement
        const mapInstance = map.value;
        const originalAnimationState = {
          zoomAnimation: mapInstance.options.zoomAnimation,
          fadeAnimation: mapInstance.options.fadeAnimation,
          markerZoomAnimation: mapInstance.options.markerZoomAnimation
        };

        // Désactiver complètement les animations en premier
        mapInstance.options.zoomAnimation = false;
        mapInstance.options.fadeAnimation = false;
        mapInstance.options.markerZoomAnimation = false;
        
        // Mémoriser l'état actuel de la carte
        const currentCenter = mapInstance.getCenter();
        const currentZoom = mapInstance.getZoom();

        // Créer une couche temporaire intermédiaire pour éviter les conflits d'animation
        const newLayer = baseMaps[baseMapName];
        
        // Masquer la nouvelle couche pendant la transition
        if (typeof newLayer.setOpacity === 'function') {
          newLayer.setOpacity(0);
        }
        
        // Gestion sécurisée de l'ajout de la couche
        if (mapInstance && typeof mapInstance.addLayer === 'function') {
          try {
            mapInstance.addLayer(newLayer);
          } catch (e) {
            console.warn('Erreur lors de l\'ajout de la couche:', e);
            // Fallback si l'ajout direct échoue
            if (typeof newLayer.addTo === 'function') {
              newLayer.addTo(mapInstance as any);
            }
          }
        }

        // Attendre que la nouvelle couche soit chargée
        await new Promise<void>((resolve) => {
          if (typeof newLayer.isLoading === 'function' && newLayer.isLoading()) {
            newLayer.once('load', () => resolve());
          } else {
            // Si pas de méthode isLoading, attendre un court délai
            setTimeout(resolve, 100);
          }
        });

        // Transition en fondu
        await new Promise<void>((resolve) => {
          let opacity = 1;
          const transition = setInterval(() => {
            opacity -= 0.1;
            
            if (activeLayer.value && typeof activeLayer.value.setOpacity === 'function') {
              activeLayer.value.setOpacity(Math.max(0, opacity));
            }
            if (typeof newLayer.setOpacity === 'function') {
              newLayer.setOpacity(Math.max(0, 1 - opacity));
            }

            if (opacity <= 0) {
              clearInterval(transition);
              if (activeLayer.value && mapInstance && typeof mapInstance.removeLayer === 'function') {
                try {
                  mapInstance.removeLayer(activeLayer.value);
                } catch (e) {
                  console.warn('Erreur lors de la suppression de la couche active:', e);
                }
              }
              activeLayer.value = newLayer;
              currentBaseMap.value = baseMapName;
              resolve();
            }
          }, 50);
        });

        // Réinitialiser la vue sans animation
        try {
          mapInstance.setView(currentCenter, currentZoom, { 
            animate: false,
            duration: 0,
            noMoveStart: true
          });
        } catch (e) {
          console.warn('Erreur lors de la réinitialisation de la vue:', e);
        }

        // Forcer un rafraîchissement de la carte sans animation
        try {
          mapInstance.invalidateSize({ animate: false, pan: false });
        } catch (e) {
          console.warn('Erreur lors de l\'invalidation de la taille:', e);
        }
        
        // Attendre un délai pour stabiliser la carte
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Restaurer les animations progressivement
        if (baseMapName !== 'Cadastre') {
          setTimeout(() => {
            try {
              // Restaurer uniquement fadeAnimation d'abord
              mapInstance.options.fadeAnimation = originalAnimationState.fadeAnimation;
              
              // Puis après un délai supplémentaire, restaurer les autres animations
              setTimeout(() => {
                try {
                  mapInstance.options.zoomAnimation = originalAnimationState.zoomAnimation;
                  mapInstance.options.markerZoomAnimation = originalAnimationState.markerZoomAnimation;
                } catch (e) {
                  console.warn('Erreur lors de la restauration des animations:', e);
                }
              }, 500);
            } catch (e) {
              console.warn('Erreur lors de la restauration des animations:', e);
            }
          }, 500);
        }
        
      } catch (error) {
        console.error('Erreur lors du changement de carte de base:', error);
        // En cas d'erreur, essayer de restaurer un état stable
        if (map.value) {
          try {
            const mapInstance = map.value;
            mapInstance.options.zoomAnimation = true;
            mapInstance.options.fadeAnimation = true;
            mapInstance.options.markerZoomAnimation = true;
            mapInstance.invalidateSize({ animate: false, pan: false });
          } catch (e) {
            console.error('Erreur lors de la restauration après échec:', e);
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