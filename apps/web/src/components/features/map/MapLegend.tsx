import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { mapLegendColors } from '@/styles/theme'
import { NO_DATA_COLOR } from '@/utils/colorUtils'
import { calculateLinearDistribution, VULNERABILITY_COLOR_SCALE } from '@/utils/scaleUtils'

import type { ColorScale, MapLegendConfig, MapLegendEntry } from '@/types/map.types'

interface MapLegendProps {
  legend?: MapLegendConfig | null
  colorScale?: ColorScale | null
  thresholds?: {
    min: number | null
    q1?: number | null
    median?: number | null
    q3?: number | null
    max: number | null
  } | null
  unit?: string | null
  lastUpdated?: string | null
  className?: string
}

// Criar stops padrão baseado na escala centralizada
// Distribui as cores uniformemente de 0 a 1
const DEFAULT_GRADIENT_STOPS: Array<[number, string]> = VULNERABILITY_COLOR_SCALE.map(
  (color, index) => {
    const stop =
      VULNERABILITY_COLOR_SCALE.length === 1 ? 0 : index / (VULNERABILITY_COLOR_SCALE.length - 1)
    return [stop, color]
  },
)

const formatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

export function MapLegend({
  legend,
  colorScale,
  thresholds,
  unit,
  lastUpdated,
  className,
}: MapLegendProps) {
  const title = legend?.title ?? 'Legenda'
  const legendUnit = legend?.unit ?? unit
  const legendUpdatedAt = legend?.lastUpdated ?? lastUpdated
  const legendType = legend?.type ?? 'fill'
  const entries = legend?.entries ?? []

  const shouldRenderGradient = legendType !== 'line' && entries.length === 0
  const gradientStops = buildGradientStops(colorScale)

  // Usar thresholds da configuração da legenda, se disponível
  const effectiveThresholds = legend?.thresholds ?? thresholds

  return (
    <Card className={cn('bg-white/10 shadow-lg backdrop-blur dark:bg-neutral-950/85', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {title}
        </CardTitle>
        {/* {legendUpdatedAt ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Atualizado em: {formatDate(legendUpdatedAt)}
          </p>
        ) : null} */}
      </CardHeader>
      <CardContent className="space-y-3">
        {legendType === 'line' ? (
          <EntriesLegend entries={entries} showNoData={legend?.showNoData ?? true} variant="line" />
        ) : shouldRenderGradient ? (
          <GradientLegend
            gradientStops={gradientStops}
            thresholds={effectiveThresholds}
            unit={legendUnit}
          />
        ) : (
          <EntriesLegend entries={entries} showNoData={legend?.showNoData ?? true} />
        )}
      </CardContent>
    </Card>
  )
}

interface GradientLegendProps {
  gradientStops: Array<[number, string]>
  thresholds?: {
    min: number | null
    q1?: number | null
    median?: number | null
    q3?: number | null
    max: number | null
  } | null
  unit?: string | null
}

function GradientLegend({ gradientStops, thresholds, unit }: GradientLegendProps) {
  const hasValues =
    thresholds !== null &&
    thresholds !== undefined &&
    thresholds.min !== null &&
    thresholds.max !== null &&
    Number.isFinite(thresholds.min) &&
    Number.isFinite(thresholds.max)

  const style = {
    background: `linear-gradient(90deg, ${gradientStops
      .map(([stop, color]) => `${color} ${Math.round(stop * 100)}%`)
      .join(', ')})`,
  }

  // Usar função centralizada para calcular 5 valores distribuídos linearmente entre min e max
  const linearValues =
    hasValues && thresholds
      ? calculateLinearDistribution(thresholds.min as number, thresholds.max as number, 5)
      : []

  return (
    <div className="space-y-3">
      <div aria-hidden="true" className="h-3 w-full rounded-full shadow-inner" style={style} />
      <div className="grid grid-cols-5 gap-2 text-center text-xs text-neutral-700 dark:text-neutral-200">
        {hasValues ? (
          <>
            {linearValues.map((value, index) => (
              <span key={index}>{formatValue(value, unit)}</span>
            ))}
          </>
        ) : (
          <span className="col-span-5 text-neutral-500 dark:text-neutral-400">
            Valores indisponíveis para este indicador
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
        <span>Baixa → Alta vulnerabilidade</span>
      </div>
      {/* <div className="flex items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm border border-neutral-300 bg-transparent dark:border-neutral-600">
            <div
              aria-hidden="true"
              className="h-full w-full rounded-sm"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(148, 163, 184, 0.25) 0, rgba(148, 163, 184, 0.25) 3px, rgba(148, 163, 184, 0.45) 3px, rgba(148, 163, 184, 0.45) 6px)',
                backgroundColor: NO_DATA_COLOR,
              }}
            />
          </div>
          <span>Sem dados</span>
        </div>
        <div className="flex items-center gap-2">
          {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
            <span
              key={level}
              className="inline-flex h-2 w-4 rounded-sm"
              style={{ backgroundColor: mapLegendColors[level] }}
              aria-hidden="true"
            />
          ))}
          <span>Baixa → Alta vulnerabilidade</span>
        </div>
      </div> */}
    </div>
  )
}

interface EntriesLegendProps {
  entries: MapLegendEntry[]
  showNoData: boolean
  variant?: 'fill' | 'line'
}

function EntriesLegend({ entries, showNoData, variant = 'fill' }: EntriesLegendProps) {
  if (entries.length === 0 && !showNoData) {
    return null
  }

  const sampleClass =
    variant === 'line'
      ? 'inline-flex h-2.5 w-8 flex-shrink-0 items-center'
      : 'inline-flex h-2.5 w-5 flex-shrink-0 rounded-sm'

  const renderSample = (color: string) => {
    if (variant === 'line') {
      return (
        <span className={sampleClass} aria-hidden="true">
          <span className="block h-[3px] w-full rounded-full" style={{ backgroundColor: color }} />
        </span>
      )
    }

    return <span className={sampleClass} style={{ backgroundColor: color }} aria-hidden="true" />
  }

  const renderNoDataSample = () => {
    if (variant === 'line') {
      return (
        <span className={sampleClass} aria-hidden="true">
          <span
            className="block h-[3px] w-full rounded-full border border-neutral-300 dark:border-neutral-500"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(148, 163, 184, 0.25) 0, rgba(148, 163, 184, 0.25) 4px, rgba(148, 163, 184, 0.45) 4px, rgba(148, 163, 184, 0.45) 8px)',
              backgroundColor: NO_DATA_COLOR,
            }}
          />
        </span>
      )
    }

    return (
      <span
        className={`${sampleClass} border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-transparent`}
      >
        <span
          aria-hidden="true"
          className="block h-full w-full rounded-sm"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, rgba(148, 163, 184, 0.25) 0, rgba(148, 163, 184, 0.25) 3px, rgba(148, 163, 184, 0.45) 3px, rgba(148, 163, 184, 0.45) 6px)',
            backgroundColor: NO_DATA_COLOR,
          }}
        />
      </span>
    )
  }

  return (
    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-2">
          {renderSample(entry.color)}
          <span className="truncate">{entry.label}</span>
        </div>
      ))}

      {showNoData ? (
        <div className="flex items-center gap-2">
          {renderNoDataSample()}
          <span className="truncate">Sem dados</span>
        </div>
      ) : null}
    </div>
  )
}

function buildGradientStops(colorScale?: ColorScale | null): Array<[number, string]> {
  if (!colorScale || colorScale.colors.length === 0) {
    return DEFAULT_GRADIENT_STOPS
  }

  const colors = colorScale.colors
  return colors.map((color, index) => {
    const stop = colors.length === 1 ? 0 : index / (colors.length - 1)
    return [stop, color] as [number, string]
  })
}

function formatValue(value: number | string | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  const numeric = Number(value)
  const formatted = formatter.format(numeric)
  return unit ? `${formatted} ${unit}` : formatted
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
