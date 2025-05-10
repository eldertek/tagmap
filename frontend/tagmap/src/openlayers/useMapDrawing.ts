import { ref } from 'vue'
import Map from 'ol/Map'
import Draw from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import Snap from 'ol/interaction/Snap'
import Translate from 'ol/interaction/Translate'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import { GeoJSON } from 'ol/format'
import type { DrawEvent } from 'ol/interaction/Draw'
import Feature from 'ol/Feature'
import { click } from 'ol/events/condition'
import { getArea, getLength } from 'ol/sphere'
import { Geometry, LineString, Point, Polygon } from 'ol/geom'
import { unByKey } from 'ol/Observable'
import type { FeatureLike } from 'ol/Feature'

export function useMapDrawing() {
  // Active drawing tool name
  const activeTool = ref<string>('')
  
  // Selected feature
  const selectedFeature = ref<Feature<Geometry> | null>(null)
  const isDrawing = ref<boolean>(false)
  
  // Vector source for drawing features
  const drawSource = new VectorSource<Feature<Geometry>>();
  
  // Draw, modify and select interactions
  let drawInteraction: Draw | null = null
  let modifyInteraction: Modify | null = null
  let selectInteraction: Select | null = null
  let snapInteraction: Snap | null = null
  
  // Event listeners
  let drawStartKey: any = null
  let drawEndKey: any = null

  // Define handle source and layer for vertex, midpoint, and center controls
  const handleSource = new VectorSource<Feature<Geometry>>();
  const handleLayer = new VectorLayer({
    source: handleSource,
    style: (feature: FeatureLike) => {
      const type = feature.get('handleType');
      let fillColor = '#DC2626'; // red for vertices
      if (type === 'midpoint') {
        fillColor = '#2B6451'; // darker green for midpoints
      }
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      });
    }
  });
  let handleTranslateInteraction: Translate | null = null;

  // Get feature style based on properties
  const getFeatureStyle = (feature: Feature<Geometry>, selected: boolean = false) => {
    const properties = feature.get('properties') || {}
    const style = properties.style || {}
    
    const strokeColor = style.color || '#3388ff'
    const fillColor = style.fillColor || 'rgba(51, 136, 255, 0.2)'
    const strokeWidth = style.weight || 3
    
    const defaultStyle = new Style({
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: strokeColor
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2
        })
      })
    })
    
    // Add text if the feature has a name
    const name = feature.get('name') || properties.name
    if (name) {
      defaultStyle.setText(new Text({
        text: name,
        font: '12px Calibri,sans-serif',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
        offsetY: -15
      }))
    }
    
    // Highlight style for selected features
    if (selected) {
      const highlightStyle = new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.4)'
        }),
        stroke: new Stroke({
          color: '#ff9933',
          width: strokeWidth + 1
        }),
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({
            color: '#ff9933'
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2
          })
        })
      })
      
      const text = defaultStyle.getText()
      if (text) {
        highlightStyle.setText(text)
      }
      
      return highlightStyle
    }
    
    return defaultStyle
  }
  
  // Style function for vector layer
  const styleFunction = (feature: FeatureLike) => {
    // Get the feature properties
    const props = feature.get('properties') || {}
    const geometry = (feature as Feature<Geometry>).getGeometry()
    const type = geometry?.getType()

    // Check if this feature is currently selected
    const selected = feature === selectedFeature.value

    // Define stroke color based on selection
    const strokeColor = selected ? '#1e88e5' : (props.style?.color || '#3388ff')
    // Determine base fill color and apply fillOpacity if provided
    let fillColor = selected ? 'rgba(30, 136, 229, 0.4)' : (props.style?.fillColor || 'rgba(51, 136, 255, 0.2)')
    if (!selected && props.style?.fillOpacity != null) {
      const opacity = props.style.fillOpacity
      // Handle hex colors
      if (fillColor.startsWith('#')) {
        const hex = fillColor.slice(1)
        const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16)
        const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16)
        const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16)
        fillColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
      }
      // Handle existing rgba strings by replacing the alpha component
      else if (fillColor.startsWith('rgba(')) {
        fillColor = fillColor.replace(/rgba\(([^,]+,[^,]+,[^,]+),\s*[\d.]+\)/, `rgba($1, ${opacity})`)
      }
    }
    const strokeWidth = selected ? (props.style?.weight + 1 || 4) : (props.style?.weight || 3)
    const radius = props.style?.radius || 12

    // Special handling for Note type (GeoNote)
    if (props.type === 'Note' && type === 'Point') {
      // Calculate marker size based on selected state
      const markerSize = selected ? radius * 1.5 : radius
      
      // Custom styling for GeoNote markers without label
      return new Style({
        image: new CircleStyle({
          radius: markerSize,
          fill: new Fill({
            color: props.style?.fillColor || '#2b6451'
          }),
          stroke: new Stroke({
            color: props.style?.color || '#2b6451',
            width: strokeWidth
          })
        })
      })
    }
    
    // Standard styling for polygons and lines
    // Return style based on geometry type
    return new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth,
        lineDash: props.style?.dashArray ? props.style?.dashArray.split(',').map((val: string) => Number(val.trim())) : undefined,
      }),
      fill: new Fill({
        color: fillColor
      }),
      image: type === 'Point' ? new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: fillColor
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: strokeWidth
        })
      }) : undefined
    })
  }
  
  // Vector layer for drawings with style function
  const drawLayer = new VectorLayer({
    source: drawSource,
    style: styleFunction
  })

  // Currently drawn features
  const features = ref<any[]>([])
  
  // Function to (re)create handle features for the selected feature
  function recreateHandles() {
    handleSource.clear();
    if (!selectedFeature.value) return;

    const geom = selectedFeature.value.getGeometry();
    if (!geom) return;

    // ----- Polygon -----
    if (geom instanceof Polygon) {
      const ring = geom.getCoordinates()[0];
      // `ring` ends with a duplicate of the first vertex, so ignore the last one
      const vertexCount = ring.length - 1;

      for (let i = 0; i < vertexCount; i++) {
        // ---- vertex handle ----
        const coord = ring[i] as [number, number];
        const vertexHandle = new Feature(new Point(coord));
        vertexHandle.set('handleType', 'vertex');
        vertexHandle.set('vertexIndex', i);
        handleSource.addFeature(vertexHandle);

        // ---- midpoint handle ----
        const nextCoord = ring[(i + 1) % vertexCount] as [number, number];
        const midCoord: [number, number] = [
          (coord[0] + nextCoord[0]) / 2,
          (coord[1] + nextCoord[1]) / 2
        ];
        const midpointHandle = new Feature(new Point(midCoord));
        midpointHandle.set('handleType', 'midpoint');
        midpointHandle.set('midpointIndex', i);
        handleSource.addFeature(midpointHandle);
      }
      return; // polygon handled, exit early
    }

    // ----- LineString -----
    if (geom instanceof LineString) {
      const coords = geom.getCoordinates() as [number, number][];
      const vertexCount = coords.length;

      for (let i = 0; i < vertexCount; i++) {
        // ---- vertex handle ----
        const coord = coords[i];
        const vertexHandle = new Feature(new Point(coord));
        vertexHandle.set('handleType', 'vertex');
        vertexHandle.set('vertexIndex', i);
        handleSource.addFeature(vertexHandle);

        // For a line we only add a midpoint when there is a *next* vertex.
        if (i < vertexCount - 1) {
          const nextCoord = coords[i + 1];
          const midCoord: [number, number] = [
            (coord[0] + nextCoord[0]) / 2,
            (coord[1] + nextCoord[1]) / 2
          ];
          const midpointHandle = new Feature(new Point(midCoord));
          midpointHandle.set('handleType', 'midpoint');
          midpointHandle.set('midpointIndex', i);
          handleSource.addFeature(midpointHandle);
        }
      }
    }
  }

  // Initialize the drawing functionality
  function initDrawing(map: Map) {
    // First, clear any existing interactions and layers
    clearDrawingInteractions(map);
    
    // Add vector layer to map
    map.addLayer(drawLayer)
    
    // Add handle layer for control points
    map.addLayer(handleLayer);
    
    // Setup handle translate interaction
    handleTranslateInteraction = new Translate({
      features: handleSource.getFeaturesCollection()!
    });
    handleTranslateInteraction.on('translatestart', (e) => {
      e.features.getArray().forEach(handle => {
        const geom = handle.getGeometry();
        if (geom) handle.set('startCoord', (geom as any).getCoordinates());
        // If the dragged handle is a midpoint, convert it to a real vertex once drag starts
        if (handle.get('handleType') === 'midpoint') {
          const feature = selectedFeature.value;
          const geometry = feature ? feature.getGeometry() : null;
          const idx = handle.get('midpointIndex');
          const start = handle.get('startCoord') as [number, number];
          if (geometry && Array.isArray(start) && idx !== undefined) {
            if (geometry instanceof Polygon) {
              const ring = geometry.getCoordinates()[0];
              ring.splice(idx + 1, 0, start);
              ring[ring.length - 1] = ring[0];
              geometry.setCoordinates([ring]);
            } else if (geometry instanceof LineString) {
              const coordsLine = geometry.getCoordinates();
              coordsLine.splice(idx + 1, 0, start);
              geometry.setCoordinates(coordsLine);
            }
            // Promote the dragged handle to a vertex handle so subsequent drag events treat it correctly
            handle.set('handleType', 'vertex');
            handle.set('vertexIndex', idx + 1);
          }
        }
      });
    });
    handleTranslateInteraction.on('translateend', (e) => {
      e.features.getArray().forEach(handle => {
        const type = handle.get('handleType');
        const start = handle.get('startCoord') as [number, number];
        const geomHandle = handle.getGeometry();
        const end = geomHandle ? (geomHandle as any).getCoordinates() as [number, number] : null;
        const feature = selectedFeature.value;
        if (!feature || !start || !end) return;
        const geometry = feature.getGeometry();
        if (!geometry) return;
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        if (type === 'vertex') {
          const idx = handle.get('vertexIndex');
          if (geometry instanceof Polygon) {
            const ring = geometry.getCoordinates()[0];
            ring[idx] = end;
            ring[ring.length - 1] = ring[0];
            geometry.setCoordinates([ring]);
          } else if (geometry instanceof LineString) {
            const coordsLine = geometry.getCoordinates();
            coordsLine[idx] = end;
            geometry.setCoordinates(coordsLine);
          }
        }
        handle.unset('startCoord');
        recreateHandles();
      });
    });
    // Reactive geometry update while dragging control point handles
    handleTranslateInteraction.on('translating', (e) => {
      e.features.getArray().forEach(handle => {
        const type = handle.get('handleType');
        const start = handle.get('startCoord') as [number, number];
        const geomHandle = handle.getGeometry();
        const end = geomHandle ? (geomHandle as any).getCoordinates() as [number, number] : null;
        const feature = selectedFeature.value;
        if (!feature || !start || !end) return;
        const geometry = feature.getGeometry();
        if (!geometry) return;
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        if (type === 'vertex') {
          const idx = handle.get('vertexIndex');
          if (geometry instanceof Polygon) {
            const ring = geometry.getCoordinates()[0];
            ring[idx] = end;
            ring[ring.length - 1] = ring[0];
            geometry.setCoordinates([ring]);
          } else if (geometry instanceof LineString) {
            const coordsLine = geometry.getCoordinates();
            coordsLine[idx] = end;
            geometry.setCoordinates(coordsLine);
          }
        }
        recreateHandles();
      });
    });
    map.addInteraction(handleTranslateInteraction);

    // Create select interaction - use layer style function
    selectInteraction = new Select({
      condition: click,
      style: null // Use the layer's style function
    })
    
    // Listen for selection changes
    selectInteraction.on('select', (e) => {
      selectedFeature.value = e.selected.length > 0 ? e.selected[0] : null
      console.log('[useMapDrawing] Selection changed:', selectedFeature.value ? 'Feature selected' : 'No selection')
      recreateHandles();
    })
    
    // Listen to changes in the source
    drawSource.on('addfeature', (event) => {
      const feature = event.feature
      if (feature) {
        // Set initial properties
        if (!feature.get('properties')) {
          feature.set('properties', {
            type: getGeometryType(feature),
            category: 'forages',
            accessLevel: 'visitor',
            style: {
              color: '#3388ff',
              fillColor: 'rgba(51, 136, 255, 0.2)',
              weight: 3
            }
          })
        }
        
        // Add a unique ID to the feature
        if (!feature.get('id')) {
          feature.set('id', Date.now().toString())
        }
        
        // Convert to GeoJSON for storage or API calls
        const geojson = new GeoJSON().writeFeatureObject(feature)
        features.value.push(geojson)
      }
    })
    
    // Listen for feature removal
    drawSource.on('removefeature', (event) => {
      const feature = event.feature
      if (feature) {
        const id = feature.get('id')
        features.value = features.value.filter(f => f.id !== id)
      }
    })
    
    // Instantiate modify and snap interactions for editing
    modifyInteraction = new Modify({ source: drawSource })
    snapInteraction = new Snap({ source: drawSource })
  }
  
  // Get geometry type as a string
  function getGeometryType(feature: Feature<Geometry>): string {
    const geometry = feature.getGeometry()
    if (!geometry) return 'unknown'
    
    if (geometry instanceof Point) return 'Point'
    if (geometry instanceof LineString) return 'LineString'
    if (geometry instanceof Polygon) return 'Polygon'
    
    return geometry.getType()
  }

  // Remove all interactions before adding new ones
  function removeAllInteractions(map: Map) {
    // Get all interactions to remove
    const interactions = map.getInteractions().getArray().slice();
    
    // Remove all custom interactions
    interactions.forEach(interaction => {
      if (interaction instanceof Draw || 
          interaction instanceof Modify || 
          interaction instanceof Snap || 
          interaction instanceof Select) {
        map.removeInteraction(interaction);
      }
    });
    
    // Reset interaction references
    if (drawInteraction) {
      if (drawStartKey) unByKey(drawStartKey);
      if (drawEndKey) unByKey(drawEndKey);
      drawInteraction = null;
    }
  }

  // Set the active drawing tool
  function setDrawingTool(tool: string, map: Map) {
    console.log('[useMapDrawing] setDrawingTool:', tool)
    
    // First remove all existing interactions
    removeAllInteractions(map);
    
    // Set the active tool
    activeTool.value = tool
    isDrawing.value = ['draw_polygon', 'draw_line_string', 'draw_point'].includes(tool)
    
    // Always add select interaction first
    map.addInteraction(selectInteraction!);
      
    // Add the appropriate interaction based on the tool
    switch (tool) {
      case 'draw_polygon':
        console.log('[useMapDrawing] activating draw_polygon')
        drawInteraction = new Draw({
          source: drawSource,
          type: 'Polygon',
          stopClick: true
        })
        
        // Add draw start and end listeners
        drawStartKey = drawInteraction.on('drawstart', () => {
          console.log('[useMapDrawing] Draw polygon started')
          isDrawing.value = true
        })
        
        drawEndKey = drawInteraction.on('drawend', (event: DrawEvent) => {
          console.log('[useMapDrawing] drawend (Polygon) geometry type:', event.feature.getGeometry()?.getType())
          isDrawing.value = false
          
          // Set properties on the newly drawn feature
          const feature = event.feature as Feature<Geometry>
          
          // Calculate area
          const polygon = feature.getGeometry() as Polygon
          const area = getArea(polygon)
          
          feature.set('properties', {
            type: 'Polygon',
            category: 'forages',
            accessLevel: 'visitor',
            area: Math.round(area * 100) / 100,
            style: {
              color: '#3388ff',
              fillColor: 'rgba(51, 136, 255, 0.2)',
              weight: 3
            }
          })
          
          // Make this the selected feature
          selectedFeature.value = feature
        })
        
        map.addInteraction(drawInteraction)
        break
        
      case 'draw_line_string':
        console.log('[useMapDrawing] activating draw_line_string')
        drawInteraction = new Draw({
          source: drawSource,
          type: 'LineString',
          stopClick: true
        })
        
        // Add draw start and end listeners
        drawStartKey = drawInteraction.on('drawstart', () => {
          console.log('[useMapDrawing] Draw line_string started')
          isDrawing.value = true
        })
        
        drawEndKey = drawInteraction.on('drawend', (event: DrawEvent) => {
          console.log('[useMapDrawing] drawend (LineString) geometry type:', event.feature.getGeometry()?.getType())
          isDrawing.value = false
          
          // Set properties on the newly drawn feature
          const feature = event.feature as Feature<Geometry>
          
          // Calculate length
          const line = feature.getGeometry() as LineString
          const length = getLength(line)
          
          feature.set('properties', {
            type: 'LineString',
            category: 'forages',
            accessLevel: 'visitor',
            length: Math.round(length * 100) / 100,
            style: {
              color: '#3388ff',
              weight: 3
            }
          })
          
          // Make this the selected feature
          selectedFeature.value = feature
        })
        
        map.addInteraction(drawInteraction)
        break
        
      case 'draw_point':
        console.log('[useMapDrawing] activating draw_point')
        drawInteraction = new Draw({
          source: drawSource,
          type: 'Point',
          stopClick: true
        })
        
        // Add draw start and end listeners
        drawStartKey = drawInteraction.on('drawstart', () => {
          console.log('[useMapDrawing] Draw point started')
          isDrawing.value = true
        })
        
        drawEndKey = drawInteraction.on('drawend', (event: DrawEvent) => {
          console.log('[useMapDrawing] drawend (Point) geometry type:', event.feature.getGeometry()?.getType())
          isDrawing.value = false
          
          // Set properties on the newly drawn feature
          const feature = event.feature as Feature<Geometry>
          
          feature.set('properties', {
            type: 'Note',
            category: 'forages',
            accessLevel: 'visitor',
            style: {
              color: '#3388ff',
              weight: 3
            }
          })
          
          // Make this the selected feature
          selectedFeature.value = feature
        })
        
        map.addInteraction(drawInteraction)
        break
        
      case 'select':
        // We already added select interaction above
        break
        
      default:
        // Just use selection for navigation (added above)
        break
    }
      }

  // Clear drawing interactions
  function clearDrawingInteractions(map: Map) {
    removeAllInteractions(map);
    // Remove handle translate interaction and clear handles
    if (handleTranslateInteraction) {
      map.removeInteraction(handleTranslateInteraction);
      handleTranslateInteraction = null;
    }
    handleSource.clear();
  }

  // Clear all drawings
  function clearDrawing(map: Map) {
    // Clear all features
    drawSource.clear()
    features.value = []
    selectedFeature.value = null
    
    // Clear interactions
    clearDrawingInteractions(map)
    activeTool.value = ''
    isDrawing.value = false
  }
  
  // Delete a specific feature
  function deleteFeature(feature: Feature<Geometry>) {
    if (!feature) return
    
    console.log('[useMapDrawing] Deleting feature:', feature.getId() || 'unnamed feature')
    
    try {
      // Remove from source
      drawSource.removeFeature(feature)
      
      // Clear selection if deleted feature was selected
      if (selectedFeature.value === feature) {
        selectedFeature.value = null
        // Clear control point handles when the feature is deleted
        recreateHandles()
      }
      console.log('[useMapDrawing] Feature deleted successfully')
    } catch (error) {
      console.error('[useMapDrawing] Error deleting feature:', error)
    }
  }
  
  // Update feature properties
  function updateFeatureProperties(feature: Feature<Geometry>, props: any) {
    if (!feature) return
    
    const properties = feature.get('properties') || {}
    feature.set('properties', { ...properties, ...props })
    
    // Update the name if provided
    if (props.name) {
      feature.set('name', props.name)
    }
    
    // Trigger redraw
    drawSource.changed()
  }
  
  // Update feature style
  function updateFeatureStyle(feature: Feature<Geometry>, style: any) {
    if (!feature) return
    
    const properties = feature.get('properties') || {}
    const currentStyle = properties.style || {}
    
    feature.set('properties', {
      ...properties,
      style: { ...currentStyle, ...style }
    })
    
    // Trigger redraw
    drawSource.changed()
  }

  return {
    initDrawing,
    setDrawingTool,
    clearDrawing,
    clearDrawingInteractions,
    deleteFeature,
    updateFeatureProperties,
    updateFeatureStyle,
    activeTool,
    isDrawing,
    drawSource,
    drawLayer,
    features,
    selectedFeature
  }
} 