import { mapLegendColors } from '@/styles/theme'
import { coerceToFiniteNumber } from './numberUtils'

const COLOR_SCALE = [
  { stop: 0, color: mapLegendColors.low }, // verde
  { stop: 0.33, color: mapLegendColors.medium }, // amarelo
  { stop: 0.66, color: mapLegendColors.high }, // laranja
  { stop: 1, color: mapLegendColors.critical }, // vermelho
] as const

export const NO_DATA_COLOR = mapLegendColors.noData

export interface ColorThresholds {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

export function calculateColorGradient(
  value: number | string | null | undefined,
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string {
  const normalizedValue = coerceToFiniteNumber(value)
  const normalizedMin = coerceToFiniteNumber(min)
  const normalizedMax = coerceToFiniteNumber(max)

  if (
    normalizedValue === null ||
    normalizedMin === null ||
    normalizedMax === null
  ) {
    return NO_DATA_COLOR
  }

  if (!Number.isFinite(normalizedMin) || !Number.isFinite(normalizedMax)) {
    return COLOR_SCALE[0]?.color ?? NO_DATA_COLOR
  }

  const safeMin = normalizedMin
  const safeMax = normalizedMax
  const range = safeMax - safeMin

  const normalized =
    range === 0 ? 0.5 : clamp((normalizedValue - safeMin) / (range || 1), 0, 1)

  return getColorForNormalizedValue(normalized)
}

export function calculateThresholds(
  values: Array<number | string | null | undefined>,
): ColorThresholds {
  const filtered = values
    .map((value) => coerceToFiniteNumber(value))
    .filter((value): value is number => value !== null)

  if (filtered.length === 0) {
    return {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
    }
  }

  const sorted = [...filtered].sort((a, b) => a - b)

  const q1 = getQuantile(sorted, 0.25)
  const median = getQuantile(sorted, 0.5)
  const q3 = getQuantile(sorted, 0.75)

  return {
    min: sorted[0] ?? 0,
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1] ?? 0,
  }
}

export function getColorScaleStops(): Array<[number, string]> {
  return COLOR_SCALE.map(({ stop, color }) => [stop, color])
}

export function getColorForNormalizedValue(value: number): string {
  const clamped = clamp(value, 0, 1)

  const index = COLOR_SCALE.findIndex(({ stop }, idx, arr) => {
    const nextStop = arr[idx + 1]?.stop ?? 1
    return clamped >= stop && clamped <= nextStop
  })

  if (index === -1 || index === COLOR_SCALE.length - 1) {
    return COLOR_SCALE[COLOR_SCALE.length - 1]?.color ?? NO_DATA_COLOR
  }

  const current = COLOR_SCALE[index]
  const next = COLOR_SCALE[index + 1]

  const localRange = next.stop - current.stop || 1
  const localT = (clamped - current.stop) / localRange

  return interpolateColor(current.color, next.color, clamp(localT, 0, 1))
}

function interpolateColor(colorA: string, colorB: string, t: number): string {
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

function getQuantile(sortedValues: number[], quantile: number): number {
  if (sortedValues.length === 0) {
    return 0
  }

  const position = (sortedValues.length - 1) * quantile
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const fraction = position - lowerIndex

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex] ?? 0
  }

  const lower = sortedValues[lowerIndex] ?? 0
  const upper = sortedValues[upperIndex] ?? 0

  return lower + (upper - lower) * fraction
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
