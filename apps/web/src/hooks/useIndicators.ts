import { useCallback, useEffect, useRef, useState } from 'react'

import { indicatorsService } from '@/services/indicators.service'
import type { IndicatorNode } from '@/types/indicators'

interface UseIndicatorsResult {
  data: IndicatorNode[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const indicatorsCache = new Map<string, IndicatorNode[]>()

export function useIndicators(workgroupId: string): UseIndicatorsResult {
  const [data, setData] = useState<IndicatorNode[] | null>(
    indicatorsCache.get(workgroupId) ?? null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchIndicators = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!indicatorsCache.has(workgroupId)) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await indicatorsService.getIndicatorsByWorkgroup(workgroupId, {
        signal: controller.signal,
      })

      if (!controller.signal.aborted) {
        indicatorsCache.set(workgroupId, response)
        setData(response)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }

      const message =
        err instanceof Error ? err : new Error('Falha desconhecida ao carregar indicadores')
      setError(message)
      setData(null)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [workgroupId])

  useEffect(() => {
    if (indicatorsCache.has(workgroupId)) {
      setData(indicatorsCache.get(workgroupId) ?? null)
      return
    }

    void fetchIndicators()

    return () => {
      abortRef.current?.abort()
    }
  }, [fetchIndicators, workgroupId])

  const refetch = useCallback(async () => {
    indicatorsCache.delete(workgroupId)
    await fetchIndicators()
  }, [fetchIndicators, workgroupId])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}

export function __resetIndicatorsCache() {
  indicatorsCache.clear()
  indicatorsService.clearCaches()
}
