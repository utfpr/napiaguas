// Escala de cores única para vulnerabilidade climática, usada em polígonos, tooltips e legenda.
// Interpola linearmente de verde (baixa) a vermelho (alta).
export const VULNERABILITY_COLOR_SCALE: [string, string, ...string[]] = [
  '#bbf7d0',
  '#fef08a',
  '#facc15',
  '#f97316',
  '#dc2626',
]

export type VulnerabilityColorScale = typeof VULNERABILITY_COLOR_SCALE

// Normaliza um valor para [0, 1] usando distribuição linear entre min e max.
export function normalizeLinear(value: number, min: number, max: number): number {
  if (value <= min) return 0
  if (value >= max) return 1

  const range = max - min
  if (range === 0 || !Number.isFinite(range)) return 0.5

  return (value - min) / range
}

// Gera `count` valores distribuídos linearmente entre min e max.
export function calculateLinearDistribution(
  min: number,
  max: number,
  count: number = 5,
): number[] {
  if (count < 2) {
    throw new Error('count must be at least 2')
  }

  const range = max - min
  const step = range / (count - 1)

  return Array.from({ length: count }, (_, index) => min + step * index)
}

export interface Thresholds {
  min: number
  q1?: number
  median?: number
  q3?: number
  max: number
}
