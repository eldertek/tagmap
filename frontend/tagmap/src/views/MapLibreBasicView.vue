<template>
  <div class="maplibre-container" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
// Import MapLibre and its CSS
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const mapContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  if (mapContainer.value) {
    // Crée une carte MapLibre basique
    new maplibregl.Map({
      container: mapContainer.value,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [1.888334, 46.603354], // [lng, lat] — centre approximatif de la France
      zoom: 5
    })
  }
})
</script>

<style scoped>
.maplibre-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style> 