/**
 * Utility functions for map operations with MapLibre
 */

/**
 * Converts Google Maps style to Cadastral JSON format
 * @returns Promise resolving to the cadastral style JSON
 */
export async function googleStyleToCadastralJSON(): Promise<any> {
  // Create cadastre layer style for raster source
  return {
    layers: [
      {
        id: 'cadastre-raster',
        type: 'raster',
        source: 'cadastre',
        paint: {
          'raster-opacity': 0.8
        },
        minzoom: 10,
        maxzoom: 22
      }
    ]
  }
}

/**
 * Calculates the area of a polygon in square meters
 * @param coordinates Array of polygon coordinates in the format [[lng, lat], [lng, lat], ...]
 * @returns The area in square meters
 */
export function calculatePolygonArea(coordinates: number[][][]): number {
  if (!coordinates || coordinates.length === 0) return 0
  
  // Use spherical approximation (sufficient for small areas)
  const earthRadius = 6371000 // Earth radius in meters
  
  // Calculate area using the Shoelace formula and then apply spherical correction
  let area = 0
  
  // Process each polygon ring (first ring is outer, others are holes)
  const outerRing = coordinates[0]
  
  if (!outerRing || outerRing.length < 3) return 0
  
  for (let i = 0; i < outerRing.length - 1; i++) {
    const p1 = outerRing[i]
    const p2 = outerRing[i + 1]
    
    // Convert to radians
    const phi1 = p1[1] * Math.PI / 180
    const phi2 = p2[1] * Math.PI / 180
    const lambda1 = p1[0] * Math.PI / 180
    const lambda2 = p2[0] * Math.PI / 180
    
    // Apply calculation
    area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2))
  }
  
  // Close the polygon
  const first = outerRing[0]
  const last = outerRing[outerRing.length - 1]
  
  // Check if the polygon is closed
  if (first[0] !== last[0] || first[1] !== last[1]) {
    const phi1 = last[1] * Math.PI / 180
    const phi2 = first[1] * Math.PI / 180
    const lambda1 = last[0] * Math.PI / 180
    const lambda2 = first[0] * Math.PI / 180
    
    area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2))
  }
  
  area = area * earthRadius * earthRadius / 2
  return Math.abs(area)
}

/**
 * Calculates the length of a linestring in meters
 * @param coordinates Array of line coordinates in the format [[lng, lat], [lng, lat], ...]
 * @returns The length in meters
 */
export function calculateLineLength(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 2) return 0
  
  const earthRadius = 6371000 // Earth radius in meters
  let length = 0
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i]
    const p2 = coordinates[i + 1]
    
    // Convert to radians
    const lat1 = p1[1] * Math.PI / 180
    const lat2 = p2[1] * Math.PI / 180
    const lon1 = p1[0] * Math.PI / 180
    const lon2 = p2[0] * Math.PI / 180
    
    // Haversine formula
    const dLat = lat2 - lat1
    const dLon = lon2 - lon1
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = earthRadius * c
    
    length += distance
  }
  
  return length
}

/**
 * Converts MapLibre coordinates to GeoJSON format
 * @param coordinates MapLibre coordinates
 * @param type Geometry type ('Point', 'LineString', 'Polygon')
 * @returns GeoJSON geometry object
 */
export function toGeoJSON(coordinates: any, type: string): GeoJSON.Geometry {
  switch (type) {
    case 'Point':
      return {
        type: 'Point',
        coordinates: coordinates
      }
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: coordinates
      }
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: coordinates
      }
    default:
      throw new Error(`Unsupported geometry type: ${type}`)
  }
}

/**
 * Formats a coordinate pair as a string
 * @param coordinates [lng, lat] coordinate pair
 * @returns Formatted coordinate string
 */
export function formatCoordinates(coordinates: [number, number]): string {
  if (!coordinates) return ''
  
  const [lng, lat] = coordinates
  
  // Format to 6 decimal places (approx. 10cm precision)
  const latFormatted = lat.toFixed(6)
  const lngFormatted = lng.toFixed(6)
  
  return `${latFormatted}, ${lngFormatted}`
}