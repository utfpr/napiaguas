import { useCallback, useEffect, useRef, useState } from 'react'

import env from '@/config/env'
import { resolveApiUrl } from '@/services/geometries.service'

export interface AggregationItem {
  comite_nome: string
  indicator_id: string
  indicator_name: string
  mean_value: number
  count: number
  min_value: number
  max_value: number
}

export interface AggregationsResponse {
  data: AggregationItem[]
  metadata: {
    total_comites: number
    indicator: {
      id: string
      name: string
      unit: string | null
    } | null
  }
}

async function fetchAggregations(
  indicatorId: string,
  signal?: AbortSignal,
): Promise<AggregationsResponse> {
  const url = resolveApiUrl(env.apiBaseUrl, [
    'workgroups',
    'agua-doce',
    'comites',
    'aggregations',
  ], { indicatorId })

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('Falha ao carregar agregações')
  }
  return response.json()
}

// Cache simples para evitar refetch desnecessário
const aggregationsCache = new Map<string, AggregationsResponse>()

export interface UseComiteAggregationsResult {
  data: AggregationsResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook para carregar agregações por comitê de bacia
 * Segue o padrão do projeto (useIndicators.ts)
 */
export function useComiteAggregations(
  indicatorId: string | null,
): UseComiteAggregationsResult {
  const [data, setData] = useState<AggregationsResponse | null>(
    indicatorId ? (aggregationsCache.get(indicatorId) ?? null) : null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!indicatorId) {
      setData(null)
      return
    }

    // Cancela requisição anterior
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Só mostra loading se não tiver cache com dados
    const cached = aggregationsCache.get(indicatorId)
    if (!cached || cached.data.length === 0) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetchAggregations(indicatorId, controller.signal)

      if (!controller.signal.aborted) {
        aggregationsCache.set(indicatorId, response)
        setData(response)
      }
    } catch (err) {
      if (controller.signal.aborted) return

      const message =
        err instanceof Error ? err : new Error('Falha ao carregar agregações')
      setError(message)
      setData(null)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [indicatorId])

  useEffect(() => {
    if (!indicatorId) {
      setData(null)
      return
    }

    // Usa cache se disponível e tem dados
    const cached = aggregationsCache.get(indicatorId)
    if (cached && cached.data.length > 0) {
      setData(cached)
      return
    }

    // Limpa cache vazio e busca novamente
    if (cached && cached.data.length === 0) {
      aggregationsCache.delete(indicatorId)
    }

    void fetchData()

    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, indicatorId])

  const refetch = useCallback(async () => {
    if (indicatorId) {
      aggregationsCache.delete(indicatorId)
    }
    await fetchData()
  }, [fetchData, indicatorId])

  return { data, isLoading, error, refetch }
}

export function __resetAggregationsCache() {
  aggregationsCache.clear()
}
