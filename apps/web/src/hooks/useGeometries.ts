import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeatureCollection } from '@napi-aguas/shared'

import { geometriesService } from '@/services/geometries.service'

interface UseGeometriesResult {
  data: FeatureCollection | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useGeometries(workgroupId: string): UseGeometriesResult {
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    controllerRef.current?.abort()

    const controller = new AbortController()
    controllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await geometriesService.getGeometriesByWorkgroup(workgroupId, {
        signal: controller.signal,
      })

      if (!controller.signal.aborted) {
        setData(response)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }

      const message = err instanceof Error ? err : new Error('Erro desconhecido ao carregar geometrias')
      setError(message)
      setData(null)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [workgroupId])

  useEffect(() => {
    void fetchData()

    return () => {
      controllerRef.current?.abort()
    }
  }, [fetchData])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
