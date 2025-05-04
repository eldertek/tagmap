import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as L from 'leaflet';
import Hammer from 'hammerjs';
import { useMapDrawing } from './useMapDrawing';

// Interface for shape being edited
interface EditableShape {
  layer: L.Layer;
  initialBounds?: L.LatLngBounds;
  initialLatLng?: L.LatLng;
  initialRadius?: number;
  points?: L.LatLng[];
  type: string;
}

export function useMobileShapeEditing() {
  const { 
    map, 
    featureGroup, 
    controlPointsGroup, 
    selectedShape, 
    clearActiveControlPoints 
  } = useMapDrawing();
  
  const isEditing = ref(false);
  const editingShape = ref<EditableShape | null>(null);
  const editingPointIndex = ref<number | null>(null);
  const gestureActive = ref(false);
  const editOverlay = ref<HTMLElement | null>(null);
  const editControls = ref<HTMLElement | null>(null);

  // Gesture states
  const initialScale = ref(1);
  const currentScale = ref(1);
  const initialRotation = ref(0);
  const currentRotation = ref(0);
  const initialCenter = ref<L.Point | null>(null);
  const currentCenter = ref<L.Point | null>(null);

  // Initialize the mobile editing features
  const initMobileEditing = () => {
    // Create overlay for capturing gestures
    createEditOverlay();
    
    // Create mobile editing controls
    createEditControls();
    
    // Listen for shape selection
    window.addEventListener('shape:selected', handleShapeSelected);
    
    // Listen for editing mode changes
    window.addEventListener('editing:start', startEditing);
    window.addEventListener('editing:end', stopEditing);
  };

  // Create transparent overlay for capturing gestures
  const createEditOverlay = () => {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-edit-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: transparent;
      display: none;
      touch-action: none;
    `;
    document.body.appendChild(overlay);
    editOverlay.value = overlay;
    
    // Initialize Hammer.js for gestures
    const hammer = new Hammer(overlay);
    
    // Enable gesture recognition
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammer.get('pinch').set({ enable: true });
    hammer.get('rotate').set({ enable: true });
    
    // Handle gestures
    hammer.on('panstart', handlePanStart);
    hammer.on('pan', handlePan);
    hammer.on('panend', handlePanEnd);
    
    hammer.on('pinchstart', handlePinchStart);
    hammer.on('pinch', handlePinch);
    hammer.on('pinchend', handlePinchEnd);
    
    hammer.on('rotatestart', handleRotateStart);
    hammer.on('rotate', handleRotate);
    hammer.on('rotateend', handleRotateEnd);
    
    // Handle tap for point selection
    hammer.on('tap', handleTap);
  };

  // Create mobile-friendly editing controls
  const createEditControls = () => {
    const controls = document.createElement('div');
    controls.className = 'mobile-edit-controls';
    controls.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      background: white;
      border-radius: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 8px;
      z-index: 2000;
      display: none;
    `;
    
    // Done button
    const doneBtn = document.createElement('button');
    doneBtn.className = 'edit-btn done-btn';
    doneBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>';
    doneBtn.addEventListener('click', stopEditing);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'edit-btn delete-btn';
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>';
    deleteBtn.addEventListener('click', deleteCurrentShape);
    
    // Add point button (visible only for lines/polygons)
    const addPointBtn = document.createElement('button');
    addPointBtn.className = 'edit-btn add-point-btn';
    addPointBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>';
    addPointBtn.addEventListener('click', addNewPoint);
    addPointBtn.style.display = 'none';
    
    // Add buttons to controls
    controls.appendChild(doneBtn);
    controls.appendChild(deleteBtn);
    controls.appendChild(addPointBtn);
    
    document.body.appendChild(controls);
    editControls.value = controls;
  };

  // Handle shape selection
  const handleShapeSelected = (e: CustomEvent) => {
    const shape = e.detail.shape;
    if (shape) {
      selectedShape.value = shape;
      
      // If we're on mobile, automatically enter edit mode
      if (window.innerWidth < 768) {
        startEditing();
      }
    }
  };

  // Start editing mode
  const startEditing = () => {
    if (!selectedShape.value || !map.value) return;
    
    isEditing.value = true;
    
    // Store the shape being edited
    const layer = selectedShape.value;
    let type = layer.properties?.type || '';
    
    // Store initial state based on shape type
    if (layer instanceof L.Circle) {
      editingShape.value = {
        layer,
        initialLatLng: layer.getLatLng(),
        initialRadius: layer.getRadius(),
        type: 'Circle'
      };
    } else if (layer instanceof L.Rectangle) {
      editingShape.value = {
        layer,
        initialBounds: layer.getBounds(),
        type: 'Rectangle'
      };
    } else if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
      editingShape.value = {
        layer,
        points: (layer.getLatLngs()[0] as L.LatLng[]).slice(),
        type: 'Polygon'
      };
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      editingShape.value = {
        layer,
        points: (layer.getLatLngs() as L.LatLng[]).slice(),
        type: type || 'Line'
      };
    } else {
      // Unsupported shape type
      editingShape.value = {
        layer,
        type: type || 'Unknown'
      };
    }
    
    // Clear standard control points
    clearActiveControlPoints();
    
    // Show mobile edit controls
    showEditControls();
    
    // Show edit overlay
    if (editOverlay.value) {
      editOverlay.value.style.display = 'block';
    }
    
    // Show add point button only for lines/polygons
    if (editControls.value) {
      const addPointBtn = editControls.value.querySelector('.add-point-btn');
      if (addPointBtn) {
        addPointBtn.style.display = 
          (type === 'Line' || type === 'Polygon' || type === 'ElevationLine') 
            ? 'block' 
            : 'none';
      }
    }
    
    // Add visual indicators for the shape being edited
    addEditingVisualIndicators();
  };

  // Stop editing mode
  const stopEditing = () => {
    isEditing.value = false;
    editingShape.value = null;
    editingPointIndex.value = null;
    
    // Hide overlay
    if (editOverlay.value) {
      editOverlay.value.style.display = 'none';
    }
    
    // Hide controls
    if (editControls.value) {
      editControls.value.style.display = 'none';
    }
    
    // Remove visual indicators
    removeEditingVisualIndicators();
    
    // Update the shape's properties
    if (selectedShape.value) {
      const layer = selectedShape.value;
      if (layer.properties && layer.properties.type) {
        updateLayerProperties(layer, layer.properties.type);
      }
    }
    
    // Reset gesture states
    resetGestureStates();
  };
  
  // Delete current shape
  const deleteCurrentShape = () => {
    if (!selectedShape.value || !featureGroup.value) return;
    
    // Remove the shape from the feature group
    featureGroup.value.removeLayer(selectedShape.value);
    
    // Clear selection
    selectedShape.value = null;
    
    // Exit editing mode
    stopEditing();
  };

  // Add visual indicators for editing
  const addEditingVisualIndicators = () => {
    if (!editingShape.value || !map.value) return;
    
    const layer = editingShape.value.layer;
    const type = editingShape.value.type;
    
    // Add style to show it's being edited
    if (layer.setStyle) {
      // Save original style if needed
      if (!layer._originalEditStyle) {
        layer._originalEditStyle = { ...layer.options };
      }
      
      // Apply editing style
      layer.setStyle({
        color: '#3B82F6',
        weight: (layer.options.weight || 3) + 1,
        opacity: 0.9,
        dashArray: '5, 5'
      });
    }
    
    // For polygons and lines, add visual handles at each point
    if (type === 'Polygon' || type === 'Line' || type === 'ElevationLine') {
      addPointHandles();
    }
  };

  // Add point handles for polygons and lines
  const addPointHandles = () => {
    if (!editingShape.value || !map.value || !controlPointsGroup.value) return;
    
    const layer = editingShape.value.layer;
    let points: L.LatLng[] = [];
    
    if (layer instanceof L.Polygon) {
      points = (layer.getLatLngs()[0] as L.LatLng[]);
    } else if (layer instanceof L.Polyline) {
      points = (layer.getLatLngs() as L.LatLng[]);
    }
    
    // Clear existing control points
    controlPointsGroup.value.clearLayers();
    
    // Add a handle for each point
    points.forEach((point, index) => {
      const handle = L.circleMarker(point, {
        radius: 8,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.7,
        weight: 2,
        className: 'edit-point-handle',
        pmIgnore: true
      });
      
      // Store the index for identification
      handle._index = index;
      
      controlPointsGroup.value?.addLayer(handle);
    });
  };

  // Remove visual indicators
  const removeEditingVisualIndicators = () => {
    if (!editingShape.value) return;
    
    const layer = editingShape.value.layer;
    
    // Restore original style
    if (layer.setStyle && layer._originalEditStyle) {
      layer.setStyle(layer._originalEditStyle);
      delete layer._originalEditStyle;
    }
    
    // Clear control points
    if (controlPointsGroup.value) {
      controlPointsGroup.value.clearLayers();
    }
  };

  // Handle pan start
  const handlePanStart = (e: HammerInput) => {
    if (!editingShape.value || !map.value) return;
    
    gestureActive.value = true;
    
    // Get the tap position
    const point = L.point(e.center.x, e.center.y);
    initialCenter.value = point;
    currentCenter.value = point;
    
    // Check if we're on a control point
    checkForControlPoint(point);
  };

  // Handle panning
  const handlePan = (e: HammerInput) => {
    if (!editingShape.value || !map.value || !gestureActive.value) return;
    
    const point = L.point(e.center.x, e.center.y);
    currentCenter.value = point;
    
    if (editingPointIndex.value !== null) {
      // We're dragging a specific point
      movePoint(point);
    } else {
      // We're moving the whole shape
      moveShape(point);
    }
  };

  // Handle pan end
  const handlePanEnd = () => {
    gestureActive.value = false;
    editingPointIndex.value = null;
    
    // Update point handles
    if (editingShape.value) {
      addPointHandles();
    }
  };

  // Handle pinch start (scaling)
  const handlePinchStart = (e: HammerInput) => {
    if (!editingShape.value || !map.value) return;
    
    gestureActive.value = true;
    initialScale.value = e.scale;
    currentScale.value = e.scale;
  };

  // Handle pinching (scaling)
  const handlePinch = (e: HammerInput) => {
    if (!editingShape.value || !map.value || !gestureActive.value) return;
    
    currentScale.value = e.scale;
    scaleShape(e.scale / initialScale.value);
  };

  // Handle pinch end
  const handlePinchEnd = () => {
    gestureActive.value = false;
    initialScale.value = 1;
    
    // Update point handles
    if (editingShape.value) {
      addPointHandles();
    }
  };

  // Handle rotate start
  const handleRotateStart = (e: HammerInput) => {
    if (!editingShape.value || !map.value) return;
    
    gestureActive.value = true;
    initialRotation.value = e.rotation;
    currentRotation.value = e.rotation;
  };

  // Handle rotation
  const handleRotate = (e: HammerInput) => {
    if (!editingShape.value || !map.value || !gestureActive.value) return;
    
    currentRotation.value = e.rotation;
    const rotationDelta = e.rotation - initialRotation.value;
    rotateShape(rotationDelta);
  };

  // Handle rotate end
  const handleRotateEnd = () => {
    gestureActive.value = false;
    initialRotation.value = 0;
    
    // Update point handles
    if (editingShape.value) {
      addPointHandles();
    }
  };

  // Handle tap for selecting points
  const handleTap = (e: HammerInput) => {
    if (!editingShape.value || !map.value) return;
    
    const point = L.point(e.center.x, e.center.y);
    
    // Check if we tapped on a control point
    const tappedOnPoint = checkForControlPoint(point);
    
    if (!tappedOnPoint && (editingShape.value.type === 'Line' || editingShape.value.type === 'Polygon')) {
      // Check if we tapped near a line segment to add a point
      checkForLineSegment(point);
    }
  };

  // Check if a point is near a control point
  const checkForControlPoint = (point: L.Point): boolean => {
    if (!controlPointsGroup.value || !map.value) return false;
    
    let foundPoint = false;
    
    controlPointsGroup.value.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        const markerPoint = map.value!.latLngToContainerPoint(layer.getLatLng());
        const distance = markerPoint.distanceTo(point);
        
        if (distance <= 20) { // 20px touch target
          editingPointIndex.value = layer._index;
          foundPoint = true;
        }
      }
    });
    
    return foundPoint;
  };

  // Check if a point is near a line segment
  const checkForLineSegment = (point: L.Point) => {
    if (!editingShape.value || !map.value) return;
    
    const layer = editingShape.value.layer;
    let points: L.LatLng[] = [];
    
    if (layer instanceof L.Polygon) {
      points = (layer.getLatLngs()[0] as L.LatLng[]).slice();
    } else if (layer instanceof L.Polyline) {
      points = (layer.getLatLngs() as L.LatLng[]).slice();
    }
    
    // Check each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = map.value.latLngToContainerPoint(points[i]);
      const p2 = map.value.latLngToContainerPoint(points[i + 1]);
      
      // Calculate distance from point to line segment
      const distance = distanceToLineSegment(point, p1, p2);
      
      if (distance <= 20) { // 20px touch target
        // Insert a new point between these points
        const midLatLng = L.latLng(
          (points[i].lat + points[i + 1].lat) / 2,
          (points[i].lng + points[i + 1].lng) / 2
        );
        
        // Add the new point
        if (layer instanceof L.Polygon) {
          const latLngs = layer.getLatLngs()[0] as L.LatLng[];
          latLngs.splice(i + 1, 0, midLatLng);
          layer.setLatLngs([latLngs]);
        } else if (layer instanceof L.Polyline) {
          const latLngs = layer.getLatLngs() as L.LatLng[];
          latLngs.splice(i + 1, 0, midLatLng);
          layer.setLatLngs(latLngs);
        }
        
        // Update point handles
        addPointHandles();
        
        // Select the new point for immediate editing
        editingPointIndex.value = i + 1;
        
        break;
      }
    }
  };

  // Add a new point at the end of a line or polygon
  const addNewPoint = () => {
    if (!editingShape.value || !map.value) return;
    
    const layer = editingShape.value.layer;
    
    if (layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      if (latLngs.length < 2) return;
      
      // Add a new point after the last point
      const lastPoint = latLngs[latLngs.length - 1];
      const secondLastPoint = latLngs[latLngs.length - 2];
      
      // Calculate a new point in the direction of the last segment
      const newLat = lastPoint.lat + (lastPoint.lat - secondLastPoint.lat) * 0.3;
      const newLng = lastPoint.lng + (lastPoint.lng - secondLastPoint.lng) * 0.3;
      
      latLngs.push(L.latLng(newLat, newLng));
      layer.setLatLngs([latLngs]);
      
      // Update point handles
      addPointHandles();
      
      // Select the new point for immediate editing
      editingPointIndex.value = latLngs.length - 1;
      
    } else if (layer instanceof L.Polyline) {
      const latLngs = layer.getLatLngs() as L.LatLng[];
      if (latLngs.length < 2) return;
      
      // Add a new point after the last point
      const lastPoint = latLngs[latLngs.length - 1];
      const secondLastPoint = latLngs[latLngs.length - 2];
      
      // Calculate a new point in the direction of the last segment
      const newLat = lastPoint.lat + (lastPoint.lat - secondLastPoint.lat) * 0.3;
      const newLng = lastPoint.lng + (lastPoint.lng - secondLastPoint.lng) * 0.3;
      
      latLngs.push(L.latLng(newLat, newLng));
      layer.setLatLngs(latLngs);
      
      // Update point handles
      addPointHandles();
      
      // Select the new point for immediate editing
      editingPointIndex.value = latLngs.length - 1;
    }
  };

  // Move a specific point
  const movePoint = (point: L.Point) => {
    if (!editingShape.value || !map.value || editingPointIndex.value === null) return;
    
    // Convert screen point to LatLng
    const newLatLng = map.value.containerPointToLatLng(point);
    const layer = editingShape.value.layer;
    
    if (layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      latLngs[editingPointIndex.value] = newLatLng;
      layer.setLatLngs([latLngs]);
      
      // Update just the moved handle
      updatePointHandle(editingPointIndex.value, newLatLng);
      
    } else if (layer instanceof L.Polyline) {
      const latLngs = layer.getLatLngs() as L.LatLng[];
      latLngs[editingPointIndex.value] = newLatLng;
      layer.setLatLngs(latLngs);
      
      // Update just the moved handle
      updatePointHandle(editingPointIndex.value, newLatLng);
    }
  };

  // Update a specific point handle
  const updatePointHandle = (index: number, latLng: L.LatLng) => {
    if (!controlPointsGroup.value) return;
    
    // Find the handle with this index
    controlPointsGroup.value.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker && layer._index === index) {
        layer.setLatLng(latLng);
      }
    });
  };

  // Move the entire shape
  const moveShape = (point: L.Point) => {
    if (!editingShape.value || !map.value || !initialCenter.value) return;
    
    // Calculate delta in pixels
    const deltaX = point.x - initialCenter.value.x;
    const deltaY = point.y - initialCenter.value.y;
    
    // Convert delta to LatLng
    const centerLatLng = map.value.getCenter();
    const targetPoint = L.point(
      map.value.getSize().x / 2 + deltaX,
      map.value.getSize().y / 2 + deltaY
    );
    const targetLatLng = map.value.containerPointToLatLng(targetPoint);
    const deltaLat = targetLatLng.lat - centerLatLng.lat;
    const deltaLng = targetLatLng.lng - centerLatLng.lng;
    
    // Move shape based on type
    const layer = editingShape.value.layer;
    
    if (layer instanceof L.Circle) {
      const currentLatLng = layer.getLatLng();
      layer.setLatLng(L.latLng(
        currentLatLng.lat + deltaLat,
        currentLatLng.lng + deltaLng
      ));
    } else if (layer instanceof L.Rectangle) {
      const bounds = layer.getBounds();
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();
      
      layer.setBounds(L.latLngBounds(
        L.latLng(nw.lat + deltaLat, nw.lng + deltaLng),
        L.latLng(se.lat + deltaLat, se.lng + deltaLng)
      ));
    } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      let latLngs: L.LatLng[] | L.LatLng[][] = layer.getLatLngs();
      
      if (layer instanceof L.Polygon) {
        // For polygons, getLatLngs returns an array of arrays
        const points = latLngs[0] as L.LatLng[];
        const newPoints = points.map(p => {
          return L.latLng(p.lat + deltaLat, p.lng + deltaLng);
        });
        layer.setLatLngs([newPoints]);
      } else {
        // For polylines, getLatLngs returns an array of LatLng
        const points = latLngs as L.LatLng[];
        const newPoints = points.map(p => {
          return L.latLng(p.lat + deltaLat, p.lng + deltaLng);
        });
        layer.setLatLngs(newPoints);
      }
      
      // Update all point handles
      if (controlPointsGroup.value) {
        controlPointsGroup.value.eachLayer((handle) => {
          if (handle instanceof L.CircleMarker) {
            const currentLatLng = handle.getLatLng();
            handle.setLatLng(L.latLng(
              currentLatLng.lat + deltaLat,
              currentLatLng.lng + deltaLng
            ));
          }
        });
      }
    }
    
    // Update initialCenter to the current position for the next movement
    initialCenter.value = point;
  };

  // Scale the shape
  const scaleShape = (scaleFactor: number) => {
    if (!editingShape.value || !map.value) return;
    
    const layer = editingShape.value.layer;
    
    if (layer instanceof L.Circle) {
      // Scale the radius
      const initialRadius = editingShape.value.initialRadius || layer.getRadius();
      layer.setRadius(initialRadius * scaleFactor);
    } else if (layer instanceof L.Rectangle) {
      // Scale the rectangle from its center
      if (!editingShape.value.initialBounds) {
        editingShape.value.initialBounds = layer.getBounds();
      }
      
      const bounds = editingShape.value.initialBounds;
      if (!bounds) return;
      
      const center = bounds.getCenter();
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();
      
      // Calculate distances from center
      const latDistNorth = nw.lat - center.lat;
      const latDistSouth = center.lat - se.lat;
      const lngDistWest = center.lng - nw.lng;
      const lngDistEast = se.lng - center.lng;
      
      // Apply scale factor
      layer.setBounds(L.latLngBounds(
        L.latLng(center.lat + latDistNorth * scaleFactor, center.lng - lngDistWest * scaleFactor),
        L.latLng(center.lat - latDistSouth * scaleFactor, center.lng + lngDistEast * scaleFactor)
      ));
    } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      // Scale from centroid
      let points: L.LatLng[] = [];
      let center: L.LatLng;
      
      if (layer instanceof L.Polygon) {
        points = layer.getLatLngs()[0] as L.LatLng[];
        // Calculate centroid for polygon
        const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
        const sumLng = points.reduce((sum, p) => sum + p.lng, 0);
        center = L.latLng(sumLat / points.length, sumLng / points.length);
      } else {
        points = layer.getLatLngs() as L.LatLng[];
        // Calculate centroid for polyline
        const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
        const sumLng = points.reduce((sum, p) => sum + p.lng, 0);
        center = L.latLng(sumLat / points.length, sumLng / points.length);
      }
      
      // Scale each point relative to center
      const newPoints = points.map(p => {
        const lat = center.lat + (p.lat - center.lat) * scaleFactor;
        const lng = center.lng + (p.lng - center.lng) * scaleFactor;
        return L.latLng(lat, lng);
      });
      
      // Update the shape
      if (layer instanceof L.Polygon) {
        layer.setLatLngs([newPoints]);
      } else {
        layer.setLatLngs(newPoints);
      }
      
      // Update all point handles
      addPointHandles();
    }
  };

  // Rotate the shape
  const rotateShape = (rotationDegrees: number) => {
    if (!editingShape.value || !map.value) return;
    
    const layer = editingShape.value.layer;
    
    // Only support rotation for polygons and polylines
    if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      // Get points and center
      let points: L.LatLng[] = [];
      let center: L.LatLng;
      
      if (layer instanceof L.Polygon) {
        points = layer.getLatLngs()[0] as L.LatLng[];
      } else {
        points = layer.getLatLngs() as L.LatLng[];
      }
      
      // Calculate centroid
      const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
      const sumLng = points.reduce((sum, p) => sum + p.lng, 0);
      center = L.latLng(sumLat / points.length, sumLng / points.length);
      
      // Convert rotation to radians
      const angle = (rotationDegrees * Math.PI) / 180;
      
      // Rotate each point around center
      const newPoints = points.map(p => {
        // Convert to Cartesian coordinates with center as origin
        const x = p.lng - center.lng;
        const y = p.lat - center.lat;
        
        // Apply rotation 
        const xNew = x * Math.cos(angle) - y * Math.sin(angle);
        const yNew = x * Math.sin(angle) + y * Math.cos(angle);
        
        // Convert back to LatLng
        return L.latLng(center.lat + yNew, center.lng + xNew);
      });
      
      // Update the shape
      if (layer instanceof L.Polygon) {
        layer.setLatLngs([newPoints]);
      } else {
        layer.setLatLngs(newPoints);
      }
      
      // Update all point handles
      addPointHandles();
    }
  };

  // Show edit controls
  const showEditControls = () => {
    if (editControls.value) {
      editControls.value.style.display = 'flex';
    }
  };

  // Reset gesture states
  const resetGestureStates = () => {
    initialScale.value = 1;
    currentScale.value = 1;
    initialRotation.value = 0;
    currentRotation.value = 0;
    initialCenter.value = null;
    currentCenter.value = null;
    gestureActive.value = false;
  };

  // Update layer properties (after editing)
  const updateLayerProperties = (layer: L.Layer, type: string) => {
    // Emit a custom event for the parent component to handle
    window.dispatchEvent(new CustomEvent('shape:propertiesNeedUpdate', {
      detail: { layer, type }
    }));
  };

  // Helper: Distance from point to line segment
  const distanceToLineSegment = (point: L.Point, p1: L.Point, p2: L.Point): number => {
    const A = point.x - p1.x;
    const B = point.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Add CSS for mobile editing
  const addCSS = () => {
    const style = document.createElement('style');
    style.textContent = `
      .mobile-edit-overlay {
        /* No additional styles needed beyond inline styles */
      }
      
      .mobile-edit-controls {
        /* Base styles are set inline */
      }
      
      .edit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin: 0 4px;
        border-radius: 22px;
        background: white;
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        color: #666;
        transition: all 0.2s;
      }
      
      .edit-btn:active {
        background: #f0f0f0;
        transform: scale(0.95);
      }
      
      .done-btn {
        background: #3B82F6;
        color: white;
      }
      
      .delete-btn {
        background: #EF4444;
        color: white;
      }
      
      .add-point-btn {
        background: #10B981;
        color: white;
      }
      
      .edit-point-handle {
        cursor: move;
      }
    `;
    document.head.appendChild(style);
  };

  // Setup and cleanup
  onMounted(() => {
    addCSS();
    initMobileEditing();
  });
  
  onUnmounted(() => {
    window.removeEventListener('shape:selected', handleShapeSelected as EventListener);
    window.removeEventListener('editing:start', startEditing as EventListener);
    window.removeEventListener('editing:end', stopEditing as EventListener);
    
    // Remove DOM elements
    if (editOverlay.value) {
      editOverlay.value.remove();
    }
    
    if (editControls.value) {
      editControls.value.remove();
    }
  });

  return {
    isEditing,
    editingShape,
    startEditing,
    stopEditing
  };
}