import { useEffect, useState } from 'react'

import { IndicatorChart } from './IndicatorChart'

import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import { GT_LITORAL_INDICATOR_MAP, type GTLitoralIndicatorKey } from '@/lib/gt-litoral/constants'
import { MUNICIPIO_INDICATOR_VALUE_MAP } from '@/lib/gt-litoral/utils'
import { gtLitoralService } from '@/services/gt-litoral.service'

interface IndicatorTrendProps {
  municipioId: string | null
  indicatorKey: GTLitoralIndicatorKey
  periodos: string[]
}

interface TrendDatum {
  label: string
  value: number | null
}

export function IndicatorTrend({ municipioId, indicatorKey, periodos }: IndicatorTrendProps) {
  const { periodosDisponiveis } = useGTLitoralContext()
  const [data, setData] = useState<TrendDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!municipioId) {
      setData([])
      return
    }

    let isActive = true
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const sortedPeriods = [...new Set(periodos.length > 0 ? periodos : periodosDisponiveis)]
          .map((value) => value)
          .sort()

        const responses = await Promise.all(
          sortedPeriods.map(async (periodo) => {
            try {
              const [municipio] = await gtLitoralService.getMunicipios(
                { municipioId, periodo },
                { signal: controller.signal },
              )

              const valueExtractor = MUNICIPIO_INDICATOR_VALUE_MAP[indicatorKey]
              const value = municipio ? valueExtractor(municipio) : null

              return {
                label: periodo,
                value: typeof value === 'number' ? Number(value.toFixed(2)) : null,
              }
            } catch (innerError) {
              return {
                label: periodo,
                value: null,
              }
            }
          }),
        )

        if (!isActive) {
          return
        }

        setData(responses)
      } catch (err) {
        if (!isActive) {
          return
        }

        setError(err instanceof Error ? err : new Error('Falha ao carregar tendência'))
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [indicatorKey, municipioId, periodos, periodosDisponiveis])

  const indicator = GT_LITORAL_INDICATOR_MAP[indicatorKey]

  return (
    <IndicatorChart
      title={`Tendência histórica - ${indicator.label}`}
      data={data}
      unit={indicator.unit}
      description={
        error ? error.message : 'Comparativo anual dos últimos períodos homologados.'
      }
      variant="line"
      loading={isLoading}
    />
  )
}
