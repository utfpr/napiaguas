import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point as GeoJsonPoint,
} from 'geojson'

import { NO_DATA_COLOR } from '@/utils/colorUtils'

import type {
  ChoroplethStyle,
  ColorScale,
  GeoJsonLayerStyle,
  LineLayerStyle,
  MapLayer,
  MarkerDatum,
} from '@/types/map.types'

export interface TooltipPosition {
  x: number
  y: number
}

export interface ContainerMetrics {
  width: number
  height: number
}

export interface FeatureStyle {
  fillColor?: string
  fillOpacity?: number
  lineColor?: string
  lineWidth?: number
}

export function calculateTooltipPosition(
  projectedPoint: TooltipPosition,
  container: ContainerMetrics,
  tooltipSize: { width: number; height: number } = { width: 240, height: 100 },
): TooltipPosition {
  const padding = 16
  const offset = 12

  // Tentar posicionar o tooltip à direita e acima do cursor
  let x = projectedPoint.x + offset
  let y = projectedPoint.y - tooltipSize.height - offset

  // Se ultrapassar a borda direita, posicionar à esquerda do cursor
  if (x + tooltipSize.width + padding > container.width) {
    x = projectedPoint.x - tooltipSize.width - offset
  }

  // Se ultrapassar a borda superior, posicionar abaixo do cursor
  if (y < padding) {
    y = projectedPoint.y + offset
  }

  // Se ainda ultrapassar a borda inferior, forçar para cima com clamp
  if (y + tooltipSize.height + padding > container.height) {
    y = container.height - tooltipSize.height - padding
  }

  // Garantir que x não ultrapasse as bordas
  x = clamp(x, padding, container.width - tooltipSize.width - padding)

  // Garantir que y não ultrapasse as bordas
  y = clamp(y, padding, container.height - tooltipSize.height - padding)

  return {
    x,
    y,
  }
}

export function sortLayersByOrder(layers: MapLayer[]): MapLayer[] {
  return [...layers].sort((a, b) => {
    const aIndex = a.zIndex ?? 0
    const bIndex = b.zIndex ?? 0

    if (aIndex === bIndex) {
      return a.id.localeCompare(b.id)
    }

    return aIndex - bIndex
  })
}

export function normalizeFeatureCollection<T extends Geometry>(
  collection: FeatureCollection<T, Record<string, unknown>> | null | undefined,
): FeatureCollection<T, Record<string, unknown>> | null {
  if (!collection) {
    return null
  }

  const normalizedFeatures = collection.features.map((feature, index) => {
    const featureId = (feature.id ?? feature.properties?.id ?? String(index)) as string | number

    const result: typeof feature = {
      type: feature.type,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        id: featureId,
      },
      id: featureId,
    }

    if (feature.bbox) {
      result.bbox = feature.bbox
    }

    return result
  })

  return {
    type: 'FeatureCollection',
    features: normalizedFeatures,
  }
}

export function simplifyFeatureCollection<T extends Geometry>(
  collection: FeatureCollection<T, Record<string, unknown>>,
  tolerance: number,
): FeatureCollection<T, Record<string, unknown>> {
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    return collection
  }

  const features = collection.features.map((feature) => ({
    ...feature,
    geometry: (simplifyGeometry(feature.geometry, tolerance) ?? feature.geometry) as T,
  }))

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function isMarkerDatumArray(
  data: FeatureCollection<GeoJsonPoint, Record<string, unknown>> | MarkerDatum[],
): data is MarkerDatum[] {
  return Array.isArray(data) && data.every((item) => Array.isArray(item.coordinates))
}

export function toMarkerFeatureCollection(
  data: FeatureCollection<GeoJsonPoint, Record<string, unknown>> | MarkerDatum[],
): FeatureCollection<GeoJsonPoint, Record<string, unknown>> {
  if (!isMarkerDatumArray(data)) {
    return data
  }

  return {
    type: 'FeatureCollection',
    features: data.map((marker, index) => ({
      type: 'Feature',
      id: marker.id ?? index,
      geometry: {
        type: 'Point',
        coordinates: marker.coordinates,
      },
      properties: {
        ...(marker.properties ?? {}),
        id: marker.id ?? index,
      },
    })),
  }
}

export function getFeatureStyle(
  feature: Feature<Geometry, Record<string, unknown>>,
  style?: GeoJsonLayerStyle,
): FeatureStyle {
  if (!style || isLineLayerStyle(style)) {
    return {
      fillColor: '#0891b2',
      fillOpacity: 0.6,
      lineColor: '#0e7490',
      lineWidth: 1,
    }
  }

  if ('mode' in style && style.mode === 'choropleth') {
    return getChoroplethStyle(feature, style)
  }

  return {
    fillColor: style.fillColor ?? '#0891b2',
    fillOpacity: style.opacity ?? 0.6,
    lineColor: style.lineColor ?? '#0e7490',
    lineWidth: style.lineWidth ?? 1,
  }
}

function isLineLayerStyle(style: GeoJsonLayerStyle): style is LineLayerStyle {
  return (style as LineLayerStyle).mode === 'line'
}

export function projectFeatureCenter(
  feature: Feature<Geometry, Record<string, unknown>>,
): [number, number] | null {
  if (!feature.geometry) {
    return null
  }

  switch (feature.geometry.type) {
    case 'Point':
      return feature.geometry.coordinates as [number, number]
    case 'MultiPoint':
    case 'LineString':
    case 'MultiLineString':
    case 'Polygon':
    case 'MultiPolygon':
      return calculateCentroid(feature)
    default:
      return null
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function calculateCentroid(
  feature: Feature<Geometry, Record<string, unknown>>,
): [number, number] | null {
  const geometry = feature.geometry

  if (!geometry) {
    return null
  }

  if (geometry.type === 'Polygon') {
    return polygonCentroid(geometry.coordinates)
  }

  if (geometry.type === 'MultiPolygon') {
    const centroids = geometry.coordinates
      .map((coords) => polygonCentroid(coords))
      .filter((coords): coords is [number, number] => coords !== null)

    if (centroids.length === 0) {
      return null
    }

    const sum = centroids.reduce(
      (acc, coords) => [acc[0] + coords[0], acc[1] + coords[1]],
      [0, 0] as [number, number],
    )

    return [sum[0] / centroids.length, sum[1] / centroids.length]
  }

  if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
    const coords =
      geometry.type === 'LineString' ? geometry.coordinates : geometry.coordinates.flat()
    if (coords.length === 0) {
      return null
    }

    const midpoint = Math.floor(coords.length / 2)
    return coords[midpoint] as [number, number]
  }

  return null
}

function polygonCentroid(coordinates: number[][][]): [number, number] | null {
  const flattened = coordinates[0]
  if (!flattened || flattened.length === 0) {
    return null
  }

  let area = 0
  let x = 0
  let y = 0

  for (let i = 0; i < flattened.length - 1; i += 1) {
    const [x1, y1] = flattened[i] ?? [0, 0]
    const [x2, y2] = flattened[i + 1] ?? [0, 0]

    const f = x1 * y2 - x2 * y1
    area += f
    x += (x1 + x2) * f
    y += (y1 + y2) * f
  }

  area *= 0.5

  if (area === 0) {
    const firstPoint = flattened[0]
    return firstPoint ? [firstPoint[0], firstPoint[1]] as [number, number] : null
  }

  const factor = 1 / (6 * area)
  return [x * factor, y * factor] as [number, number]
}

function getChoroplethStyle(
  feature: Feature<Geometry, Record<string, unknown>>,
  style: ChoroplethStyle,
): FeatureStyle {
  const propertyKey = style.property ?? 'value'
  const value = feature.properties?.[propertyKey]
  const color = getColorFromScale(style.colorScale, value)

  return {
    fillColor: color,
    fillOpacity: style.opacity ?? 0.85,
    lineColor: style.outlineColor ?? '#0f172a',
    lineWidth: style.outlineWidth ?? 1,
  }
}

export function getColorFromScale(
  scale: ColorScale,
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return scale.noDataColor ?? NO_DATA_COLOR
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return scale.noDataColor ?? NO_DATA_COLOR
  }

  const [min, max] = scale.domain
  const safeMax = max === min ? min + 1 : max
  const normalized = (numericValue - min) / (safeMax - min || 1)
  const clamped = scale.clamp === false ? normalized : clamp(normalized, 0, 1)

  if (scale.stops && scale.stops.length > 0) {
    for (let index = 0; index < scale.stops.length; index += 1) {
      const stop = scale.stops[index]
      const color = scale.colors[index] ?? scale.colors[scale.colors.length - 1]

      if (numericValue <= stop) {
        return color
      }
    }

    return scale.colors[scale.colors.length - 1]
  }

  if (scale.colors.length === 0) {
    return NO_DATA_COLOR
  }

  if (scale.colors.length === 1) {
    return scale.colors[0]
  }

  const scaledIndex = clamped * (scale.colors.length - 1)
  const lowerIndex = Math.floor(scaledIndex)
  const upperIndex = Math.ceil(scaledIndex)
  const t = scaledIndex - lowerIndex

  const lowerColor = scale.colors[lowerIndex] ?? scale.colors[0]
  const upperColor =
    scale.colors[upperIndex] ?? scale.colors[scale.colors.length - 1]

  if (lowerIndex === upperIndex) {
    return lowerColor
  }

  return interpolateColors(lowerColor, upperColor, t)
}

function interpolateColors(colorA: string, colorB: string, t: number): string {
  const start = hexToRgb(colorA)
  const end = hexToRgb(colorB)

  if (!start || !end) {
    return colorA
  }

  const interpolated = start.map((component, index) =>
    Math.round(component + (end[index] - component) * t),
  )

  return rgbToHex(interpolated[0], interpolated[1], interpolated[2])
}

function hexToRgb(hex: string): [number, number, number] | null {
  const sanitized = hex.replace('#', '')

  if (sanitized.length !== 6) {
    return null
  }

  const [r, g, b] = sanitized.match(/.{1,2}/g) ?? []
  if (r === undefined || g === undefined || b === undefined) {
    return null
  }

  const red = Number.parseInt(r, 16)
  const green = Number.parseInt(g, 16)
  const blue = Number.parseInt(b, 16)

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return null
  }

  return [red, green, blue]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function simplifyGeometry(geometry: Geometry | null, tolerance: number): Geometry | null {
  if (!geometry) {
    return null
  }

  switch (geometry.type) {
    case 'Point':
    case 'MultiPoint':
      return geometry
    case 'LineString':
      return {
        ...geometry,
        coordinates: simplifyLineString(geometry.coordinates, tolerance),
      }
    case 'MultiLineString':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((line) =>
          simplifyLineString(line, tolerance),
        ),
      }
    case 'Polygon':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring) =>
          simplifyPolygonRing(ring, tolerance),
        ),
      }
    case 'MultiPolygon':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) => simplifyPolygonRing(ring, tolerance)),
        ),
      }
    case 'GeometryCollection':
      return {
        ...geometry,
        geometries: geometry.geometries.map((item) =>
          simplifyGeometry(item, tolerance) ?? item,
        ),
      }
    default:
      return geometry
  }
}

function simplifyLineString(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) {
    return points
  }

  const simplified = ramerDouglasPeucker(points, tolerance)
  if (simplified.length < 2) {
    return points.slice(0, 2)
  }

  return simplified
}

function simplifyPolygonRing(ring: number[][], tolerance: number): number[][] {
  if (ring.length <= 4) {
    return ring
  }

  const closedRing =
    ring[0] && ring[ring.length - 1] && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0] ?? [ring[0]?.[0] ?? 0, ring[0]?.[1] ?? 0]]

  const simplified = ramerDouglasPeucker(closedRing, tolerance)
  if (simplified.length < 4) {
    return closedRing
  }

  const [firstX, firstY] = simplified[0] ?? [0, 0]
  const [lastX, lastY] = simplified[simplified.length - 1] ?? [firstX, firstY]

  if (firstX !== lastX || firstY !== lastY) {
    simplified.push([firstX, firstY])
  }

  return simplified
}

function ramerDouglasPeucker(points: number[][], epsilon: number): number[][] {
  if (points.length <= 2) {
    return points.slice()
  }

  let maxDistance = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i] ?? [0, 0], points[0] ?? [0, 0], points[end] ?? [0, 0])
    if (distance > maxDistance) {
      index = i
      maxDistance = distance
    }
  }

  if (maxDistance > epsilon) {
    const left = ramerDouglasPeucker(points.slice(0, index + 1), epsilon)
    const right = ramerDouglasPeucker(points.slice(index), epsilon)

    return [...left.slice(0, -1), ...right]
  }

  return [points[0] ?? [0, 0], points[end] ?? [0, 0]]
}

function perpendicularDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[],
): number {
  const [x, y] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd

  const dx = x2 - x1
  const dy = y2 - y1

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1)
  }

  const numerator = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1)
  const denominator = Math.sqrt(dx * dx + dy * dy)

  return numerator / (denominator || 1)
}
