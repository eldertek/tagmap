<template>
  <div class="openlayers-map-view h-full">
    <!-- OpenLayers map will be rendered here -->
    <div ref="mapContainer" class="map-container h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { useMapState } from './useMapState'
import { useMapDrawing } from './useMapDrawing'

const mapContainer = ref<HTMLElement | null>(null)
let olMap: Map

const { initialView, baseLayers } = useMapState()
const { initDrawing } = useMapDrawing()

onMounted(() => {
  if (mapContainer.value) {
    olMap = new Map({
      target: mapContainer.value,
      layers: baseLayers.value,
      view: new View(initialView.value),
    })
    initDrawing(olMap)
  }
})

onUnmounted(() => {
  if (olMap) {
    olMap.setTarget(null)
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style> 