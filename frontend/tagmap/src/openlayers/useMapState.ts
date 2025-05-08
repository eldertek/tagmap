import { ref } from 'vue'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import View from 'ol/View'
import type { Coordinate } from 'ol/coordinate'

export function useMapState() {
  // Initial view configuration
  const initialView = ref({
    center: [0, 0] as Coordinate,
    zoom: 2,
  })

  // Base layers for the map
  const baseLayers = ref<TileLayer[]>([
    new TileLayer({
      source: new OSM(),
    }),
  ])

  function addBaseLayer(layer: TileLayer) {
    baseLayers.value.push(layer)
  }

  function changeView(viewConfig: { center: Coordinate; zoom: number }) {
    initialView.value = viewConfig
  }

  return {
    initialView,
    baseLayers,
    addBaseLayer,
    changeView,
  }
} 