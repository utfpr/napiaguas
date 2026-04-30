import type maplibregl from 'maplibre-gl'

export const NO_DATA_PATTERN_ID = 'agua-doce-no-data-hatch'

export interface HatchPatternOptions {
  size?: number
  lineWidth?: number
  strokeStyle?: string
  backgroundStyle?: string
  pixelRatio?: number
}

export function ensureNoDataPattern(
  map: maplibregl.Map,
  options: HatchPatternOptions = {},
): string | null {
  if (map.hasImage(NO_DATA_PATTERN_ID)) {
    return NO_DATA_PATTERN_ID
  }

  const size = options.size ?? 8
  const pixelRatio = options.pixelRatio ?? window.devicePixelRatio ?? 1
  const canvas = document.createElement('canvas')
  canvas.width = size * pixelRatio
  canvas.height = size * pixelRatio

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  context.scale(pixelRatio, pixelRatio)
  context.fillStyle = options.backgroundStyle ?? 'rgba(229, 231, 235, 0.6)'
  context.fillRect(0, 0, size, size)

  context.strokeStyle = options.strokeStyle ?? 'rgba(148, 163, 184, 0.8)'
  context.lineWidth = options.lineWidth ?? 1

  context.beginPath()
  context.moveTo(0, size)
  context.lineTo(size, 0)
  context.stroke()

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  map.addImage(NO_DATA_PATTERN_ID, imageData, { pixelRatio })

  return NO_DATA_PATTERN_ID
}
