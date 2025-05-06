/**
 * Types pour MapLibre GL JS
 * Ce fichier contient les types et interfaces spécifiques à l'implémentation MapLibre
 */

import type { Map as MapLibreMap } from 'maplibre-gl'
import type { DrawFeature, Options as DrawOptions, DrawMode } from '@mapbox/mapbox-gl-draw'

/**
 * Types des sources de tuiles
 */
export interface TileSource {
  type: string
  tiles: string[]
  tileSize: number
  attribution: string
}

/**
 * Interface pour les sources de tuiles disponibles
 */
export interface TileSources {
  [key: string]: TileSource
}

/**
 * Paramètres pour initialiser une carte MapLibre
 */
export interface MapLibreInitOptions {
  container: HTMLElement
  center: [number, number]
  zoom: number
  minZoom?: number
  maxZoom?: number
  style?: any // Style de la carte
  hash?: boolean
  attributionControl?: boolean
  preserveDrawingBuffer?: boolean
}

/**
 * Options pour les contrôles de dessin
 */
export interface DrawControlOptions extends DrawOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Interface pour le résultat d'un événement de dessin
 */
export interface DrawEvent {
  type: string
  features: DrawFeature[]
}

/**
 * Types d'outils de dessin
 */
export type DrawingTool = 'point' | 'line' | 'polygon' | 'select' | 'trash'

/**
 * Modes de dessin disponibles
 */
export enum DrawingMode {
  DRAW_POINT = 'draw_point',
  DRAW_LINE = 'draw_line_string',
  DRAW_POLYGON = 'draw_polygon',
  SIMPLE_SELECT = 'simple_select',
  DIRECT_SELECT = 'direct_select'
}

/**
 * Interface pour les événements du plugin de dessin
 */
export interface DrawHandlers {
  create?: (event: DrawEvent) => void
  update?: (event: DrawEvent) => void
  selectionchange?: (event: DrawEvent) => void
  delete?: (event: DrawEvent) => void
  modechange?: (event: { mode: DrawMode }) => void
  render?: (event: any) => void
  actionable?: (event: { actions: Record<string, boolean> }) => void
}