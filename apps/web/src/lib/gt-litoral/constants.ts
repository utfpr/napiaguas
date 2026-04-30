import type { GTLitoralIndicadoresConsolidados } from '@/types/gt-litoral.types'

export type GTLitoralIndicatorKey =
  | 'risco_inundacao'
  | 'elevacao_costeira_m'
  | 'populacao_zona_risco'
  | 'indice_integrado'
  | 'confiabilidade_dados'
  | 'indice_resiliencia_costeira'

export interface GTLitoralIndicatorOption {
  key: GTLitoralIndicatorKey
  label: string
  unit?: string
  description?: string
  format: 'percentage' | 'decimal' | 'integer'
  colorScale: {
    domain: [number, number]
    colors: [string, string, ...string[]]
    noDataColor?: string
  }
}

export const GT_LITORAL_INDICATOR_OPTIONS: GTLitoralIndicatorOption[] = [
  {
    key: 'risco_inundacao',
    label: 'Risco de Inundação',
    description:
      'Probabilidade de eventos extremos de inundação envolvendo marés astronômicas e ondas.',
    unit: '%',
    format: 'percentage',
    colorScale: {
      domain: [0, 1],
      colors: ['#e0f2fe', '#0369a1'],
      noDataColor: '#f4f4f5',
    },
  },
  {
    key: 'elevacao_costeira_m',
    label: 'Elevação Costeira (m)',
    description: 'Média de elevação das áreas costeiras monitoradas por município.',
    unit: 'm',
    format: 'decimal',
    colorScale: {
      domain: [0, 20],
      colors: ['#fefce8', '#f59e0b', '#b45309'],
      noDataColor: '#f4f4f5',
    },
  },
  {
    key: 'populacao_zona_risco',
    label: 'População em Zona de Risco',
    description: 'Habitantes expostos a zonas costeiras consideradas de alto risco.',
    unit: 'hab.',
    format: 'integer',
    colorScale: {
      domain: [0, 10000],
      colors: ['#ecfdf5', '#10b981', '#065f46'],
      noDataColor: '#f4f4f5',
    },
  },
  {
    key: 'indice_integrado',
    label: 'Índice Integrado',
    description: 'Indicador normalizado (0-1) que sintetiza múltiplos fatores de risco.',
    format: 'decimal',
    colorScale: {
      domain: [0, 1],
      colors: ['#eef2ff', '#4f46e5'],
      noDataColor: '#f4f4f5',
    },
  },
  {
    key: 'confiabilidade_dados',
    label: 'Confiabilidade dos Dados',
    description: 'Qualidade e cobertura das fontes utilizadas na consolidação.',
    format: 'decimal',
    colorScale: {
      domain: [0, 1],
      colors: ['#fdf2f8', '#db2777'],
      noDataColor: '#f4f4f5',
    },
  },
  {
    key: 'indice_resiliencia_costeira',
    label: 'Resiliência Costeira',
    description: 'Capacidade de resposta e recuperação a eventos costeiros extremos.',
    format: 'decimal',
    colorScale: {
      domain: [0, 1],
      colors: ['#fef2f2', '#ef4444'],
      noDataColor: '#f4f4f5',
    },
  },
]

export const DEFAULT_GT_LITORAL_INDICATOR: GTLitoralIndicatorKey = 'risco_inundacao'

export const GTLITORAL_PERIOD_FORMATTER: Record<
  'percentage' | 'decimal' | 'integer',
  (value: number | null | undefined) => string
> = {
  percentage: (value) => {
    if (typeof value !== 'number') {
      return '—'
    }

    return `${Math.round(value * 100)}%`
  },
  decimal: (value) => {
    if (typeof value !== 'number') {
      return '—'
    }

    return value.toFixed(2)
  },
  integer: (value) => {
    if (typeof value !== 'number') {
      return '—'
    }

    return new Intl.NumberFormat('pt-BR').format(Math.round(value))
  },
}

export const GT_LITORAL_INDICATOR_MAP = GT_LITORAL_INDICATOR_OPTIONS.reduce<
  Record<GTLitoralIndicatorKey, GTLitoralIndicatorOption>
>((acc, option) => {
  acc[option.key] = option
  return acc
}, {} as Record<GTLitoralIndicatorKey, GTLitoralIndicatorOption>)

export const GT_LITORAL_CARD_INDICATORS: Array<{
  key: GTLitoralIndicatorKey
  icon: string
  highlight?: (data: GTLitoralIndicadoresConsolidados | null) => string
}> = [
  {
    key: 'risco_inundacao',
    icon: 'waves',
  },
  {
    key: 'indice_integrado',
    icon: 'activity',
  },
  {
    key: 'indice_resiliencia_costeira',
    icon: 'shield',
    highlight: (data) =>
      data?.indiceResilienciaCosteiraMedia != null
        ? GTLITORAL_PERIOD_FORMATTER.decimal(data.indiceResilienciaCosteiraMedia)
        : '—',
  },
  {
    key: 'populacao_zona_risco',
    icon: 'users',
  },
]
