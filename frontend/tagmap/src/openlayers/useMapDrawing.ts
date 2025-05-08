import { ref } from 'vue'

export function useMapDrawing() {
  // Active drawing tool name
  const activeTool = ref<string>('')

  function initDrawing(map: import('ol/Map').Map) {
    // Initialize drawing interactions here
  }

  function setDrawingTool(tool: string) {
    activeTool.value = tool
    // TODO: switch drawing interaction based on selected tool
  }

  function clearDrawing() {
    // TODO: remove all drawing interactions from the map
  }

  return {
    initDrawing,
    setDrawingTool,
    clearDrawing,
    activeTool,
  }
} 