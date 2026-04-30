import type { ExpressionSpecification } from 'maplibre-gl'

interface LineColorExpressionOptions {
  /**
   * Propriedade utilizada para calcular a cor.
   * @default indicator_normalized
   */
  property?: string
  /**
   * Cor aplicada quando a feature não possui o valor esperado.
   * @default #CCCCCC
   */
  noDataColor?: string
}

interface LineWidthExpressionOptions {
  /**
   * Propriedade utilizada para calcular a largura.
   * @default indicator_normalized
   */
  property?: string
  /**
   * Valor de fallback quando a propriedade não estiver presente.
   * @default média entre minWidth e maxWidth
   */
  fallbackWidth?: number
  /**
   * Domínio usado na interpolação.
   * @default [0, 1]
   */
  domain?: [number, number]
}

const DEFAULT_INDICATOR_PROPERTY = 'indicator_normalized'
const DEFAULT_NO_DATA_COLOR = '#CCCCCC'

export function createLineColorExpression(
  domain: number[],
  colors: string[],
  options: LineColorExpressionOptions = {},
): ExpressionSpecification {
  if (domain.length === 0) {
    throw new Error('Domain deve possuir pelo menos um valor')
  }

  if (colors.length < 2) {
    throw new Error('Defina ao menos duas cores para interpolação')
  }

  if (domain.length !== colors.length) {
    throw new Error('Domain e colors precisam ter o mesmo comprimento')
  }

  const property = options.property ?? DEFAULT_INDICATOR_PROPERTY
  const noDataColor = options.noDataColor ?? DEFAULT_NO_DATA_COLOR

  const interpolation: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['get', property],
  ]

  domain.forEach((stop, index) => {
    interpolation.push(stop, colors[index])
  })

  return [
    'case',
    ['all', ['has', property], ['==', ['typeof', ['get', property]], 'number']],
    interpolation,
    noDataColor,
  ]
}

export function createLineWidthExpression(
  minWidth: number,
  maxWidth: number,
  options: LineWidthExpressionOptions = {},
): ExpressionSpecification {
  if (!Number.isFinite(minWidth) || !Number.isFinite(maxWidth)) {
    throw new Error('minWidth e maxWidth devem ser números finitos')
  }

  const domain = options.domain ?? [0, 1]
  if (domain.length !== 2) {
    throw new Error('Domain deve conter exatamente dois valores [min, max]')
  }

  const property = options.property ?? DEFAULT_INDICATOR_PROPERTY
  const fallback =
    options.fallbackWidth ?? Number(((minWidth + maxWidth) / 2).toFixed(2))

  const interpolation: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['get', property],
    domain[0],
    minWidth,
    domain[1],
    maxWidth,
  ]

  return [
    'case',
    ['all', ['has', property], ['==', ['typeof', ['get', property]], 'number']],
    interpolation,
    fallback,
  ]
}
