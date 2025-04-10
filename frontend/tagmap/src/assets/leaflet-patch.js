/**
 * Patch pour Leaflet pour corriger les erreurs de zoom après la fermeture d'un popup
 */

// Fonction exécutée après le chargement complet de la page
document.addEventListener('DOMContentLoaded', function() {
  // Attendre un peu pour s'assurer que Leaflet est chargé
  setTimeout(() => {
    console.log('[Leaflet Patch] Application des correctifs pour Leaflet');
    
    // Patch pour Popup._animateZoom
    if (L.Popup && L.Popup.prototype._animateZoom) {
      const originalPopupAnimateZoom = L.Popup.prototype._animateZoom;
      
      L.Popup.prototype._animateZoom = function(e) {
        try {
          // Vérifier que this._map existe
          if (!this._map) {
            console.warn('[Leaflet Patch] Popup._animateZoom appelé avec this._map null');
            return;
          }
          
          // Vérifier que les paramètres sont valides
          if (!e || !e.center || e.zoom === undefined || !this._latlng) {
            console.warn('[Leaflet Patch] Popup._animateZoom appelé avec des paramètres invalides');
            return;
          }
          
          // Vérifier que this._container existe
          if (!this._container) {
            console.warn('[Leaflet Patch] Popup._animateZoom appelé avec this._container null');
            return;
          }
          
          // Appeler la méthode originale
          originalPopupAnimateZoom.call(this, e);
        } catch (err) {
          console.warn('[Leaflet Patch] Erreur dans Popup._animateZoom', err);
        }
      };
      
      console.log('[Leaflet Patch] Popup._animateZoom patché');
    }
    
    // Patch pour Marker._animateZoom
    if (L.Marker && L.Marker.prototype._animateZoom) {
      const originalMarkerAnimateZoom = L.Marker.prototype._animateZoom;
      
      L.Marker.prototype._animateZoom = function(e) {
        try {
          // Vérifier que this._map existe
          if (!this._map) {
            console.warn('[Leaflet Patch] Marker._animateZoom appelé avec this._map null');
            return;
          }
          
          // Vérifier que les paramètres sont valides
          if (!e || !e.center || e.zoom === undefined) {
            console.warn('[Leaflet Patch] Marker._animateZoom appelé avec des paramètres invalides');
            return;
          }
          
          // Appeler la méthode originale
          originalMarkerAnimateZoom.call(this, e);
        } catch (err) {
          console.warn('[Leaflet Patch] Erreur dans Marker._animateZoom', err);
        }
      };
      
      console.log('[Leaflet Patch] Marker._animateZoom patché');
    }
    
    // Patch pour Tooltip._animateZoom
    if (L.Tooltip && L.Tooltip.prototype._animateZoom) {
      const originalTooltipAnimateZoom = L.Tooltip.prototype._animateZoom;
      
      L.Tooltip.prototype._animateZoom = function(e) {
        try {
          // Vérifier que this._map existe
          if (!this._map) {
            console.warn('[Leaflet Patch] Tooltip._animateZoom appelé avec this._map null');
            return;
          }
          
          // Vérifier que les paramètres sont valides
          if (!e || !e.center || e.zoom === undefined || !this._latlng) {
            console.warn('[Leaflet Patch] Tooltip._animateZoom appelé avec des paramètres invalides');
            return;
          }
          
          // Appeler la méthode originale
          originalTooltipAnimateZoom.call(this, e);
        } catch (err) {
          console.warn('[Leaflet Patch] Erreur dans Tooltip._animateZoom', err);
        }
      };
      
      console.log('[Leaflet Patch] Tooltip._animateZoom patché');
    }
    
    // Patch pour DivIcon._animateZoom
    if (L.DivIcon && L.DivIcon.prototype._animateZoom) {
      const originalDivIconAnimateZoom = L.DivIcon.prototype._animateZoom;
      
      L.DivIcon.prototype._animateZoom = function(e) {
        try {
          // Vérifier que this._map existe
          if (!this._map) {
            console.warn('[Leaflet Patch] DivIcon._animateZoom appelé avec this._map null');
            return;
          }
          
          // Vérifier que les paramètres sont valides
          if (!e || !e.center || e.zoom === undefined) {
            console.warn('[Leaflet Patch] DivIcon._animateZoom appelé avec des paramètres invalides');
            return;
          }
          
          // Appeler la méthode originale
          originalDivIconAnimateZoom.call(this, e);
        } catch (err) {
          console.warn('[Leaflet Patch] Erreur dans DivIcon._animateZoom', err);
        }
      };
      
      console.log('[Leaflet Patch] DivIcon._animateZoom patché');
    }
    
    // Patch pour Map._latLngToNewLayerPoint
    if (L.Map && L.Map.prototype._latLngToNewLayerPoint) {
      const originalLatLngToNewLayerPoint = L.Map.prototype._latLngToNewLayerPoint;
      
      L.Map.prototype._latLngToNewLayerPoint = function(latlng, zoom, center) {
        try {
          // Vérifier que les paramètres sont valides
          if (!latlng || zoom === undefined || !center) {
            console.warn('[Leaflet Patch] _latLngToNewLayerPoint appelé avec des paramètres invalides');
            return new L.Point(0, 0);
          }
          
          // Appeler la méthode originale
          return originalLatLngToNewLayerPoint.call(this, latlng, zoom, center);
        } catch (err) {
          console.warn('[Leaflet Patch] Erreur dans _latLngToNewLayerPoint', err);
          return new L.Point(0, 0);
        }
      };
      
      console.log('[Leaflet Patch] Map._latLngToNewLayerPoint patché');
    }
    
    console.log('[Leaflet Patch] Tous les correctifs ont été appliqués');
  }, 1000);
});

// Exporter une fonction vide pour permettre l'import
export default function applyLeafletPatches() {
  console.log('[Leaflet Patch] Module chargé');
}
