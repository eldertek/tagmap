# MapLibre Integration with Google Maps

## Overview

This directory contains the integration of Google Maps into the TagMap application using MapLibre GL as the map rendering engine. We've moved from a backend tile proxy approach to a more direct client-side integration using the [maplibre-google-maps](https://github.com/traccar/maplibre-google-maps) library.

## Key Components

- **MapService.ts**: A service class that handles the integration with Google Maps and provides utility functions for creating map styles.
- **maplibre-google-maps**: A library that provides a protocol handler for MapLibre to directly load Google Maps tiles.

## How It Works

1. The application still retrieves the Google Maps API key from the backend using the same endpoint (`/api/settings/get_google_maps_api_key/`).
2. Instead of proxying tile requests through our backend, we now:
   - Register a custom protocol handler in MapLibre for Google Maps
   - Create a style configuration using the API key
   - Let MapLibre handle the tile requests directly to Google's servers

## Benefits

- **Reduced Backend Load**: The backend no longer has to handle and proxy all map tile requests.
- **Better Performance**: Direct communication between the client and Google's servers.
- **Simplified Architecture**: Removed complexity from the backend.
- **Official SDK Support**: Uses official Google Maps API endpoints rather than reverse-engineered solutions.

## Usage

To use Google Maps in a MapLibre component:

```typescript
import { mapService } from '@/maplibre/utils/MapService';

// In your component
async function initMap() {
  // To create a Google Maps style:
  const googleStyle = await mapService.createGoogleMapStyle();
  
  // Initialize MapLibre with this style
  const map = new maplibregl.Map({
    container: mapContainer,
    style: googleStyle,
    center: [2.35, 48.85], // Paris
    zoom: 10
  });
}
```

## Fallback Mechanism

If Google Maps is not available or there's an error with the API key, the service will fall back to using IGN tiles which are freely available.

## Security

The Google Maps API key is still managed securely through the backend and is never exposed directly in the client code. The backend endpoint returns a constructed URL with the key already embedded. 