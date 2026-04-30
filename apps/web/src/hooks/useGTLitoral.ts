import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  GTLitoralNotFoundError,
  GTLitoralTimeoutError,
  GTLitoralValidationError,
  gtLitoralService,
} from '@/services/gt-litoral.service'
import type {
  GTLitoralFilters,
  GTLitoralIndicadoresConsolidados,
  GTLitoralMunicipioDetalhado,
  GTLitoralPeriodo,
  GTLitoralRequestOptions,
} from '@/types/gt-litoral.types'

const DEFAULT_ERROR_MESSAGE = 'Erro desconhecido ao carregar dados do GT Litoral'

const municipiosCache = new Map<string, GTLitoralMunicipioDetalhado[]>()
const consolidadoCache = new Map<string, GTLitoralIndicadoresConsolidados>()

const cloneDeep = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const cloneMunicipios = (data: GTLitoralMunicipioDetalhado[]): GTLitoralMunicipioDetalhado[] =>
  data.map((municipio) => ({
    ...municipio,
    indicadores: { ...municipio.indicadores },
    indicadoresComplementares: { ...municipio.indicadoresComplementares },
    fontes_dados: municipio.fontes_dados ? [...municipio.fontes_dados] : undefined,
    faixa_costeira: municipio.faixa_costeira
      ? {
          ...municipio.faixa_costeira,
          geometry: cloneDeep(municipio.faixa_costeira.geometry),
          properties: { ...municipio.faixa_costeira.properties },
        }
      : undefined,
    geometria: cloneDeep(municipio.geometria),
  }))

const cloneConsolidado = (
  data: GTLitoralIndicadoresConsolidados,
): GTLitoralIndicadoresConsolidados => ({
  ...data,
  distribuicaoRiscoInundacao: { ...data.distribuicaoRiscoInundacao },
  fontesDados: [...data.fontesDados],
})

const buildCacheKey = (filters?: GTLitoralFilters): string =>
  JSON.stringify(filters ?? {}, Object.keys(filters ?? {}).sort())

interface RefetchOptions {
  ignoreCache?: boolean
}

export interface UseGTLitoralResult {
  data: GTLitoralMunicipioDetalhado[] | null
  consolidado: GTLitoralIndicadoresConsolidados | null
  isLoading: boolean
  error: Error | null
  filters: GTLitoralFilters | undefined
  periodosDisponiveis: GTLitoralPeriodo[]
  setFilters: (nextFilters: GTLitoralFilters | undefined) => void
  refetch: (options?: RefetchOptions) => Promise<void>
  getMunicipioById: (
    id: string,
    options?: GTLitoralRequestOptions,
  ) => Promise<GTLitoralMunicipioDetalhado>
  getIndicadoresConsolidados: (
    filtros?: { periodo?: string },
    options?: GTLitoralRequestOptions,
  ) => Promise<GTLitoralIndicadoresConsolidados>
}

// Fornece dados do GT Litoral com loading state e cache em memória por conjunto de filtros.
export function useGTLitoral(initialFilters?: GTLitoralFilters): UseGTLitoralResult {
  const [filters, setFiltersState] = useState<GTLitoralFilters | undefined>(
    initialFilters ? { ...initialFilters } : undefined,
  )
  const [municipios, setMunicipios] = useState<GTLitoralMunicipioDetalhado[] | null>(null)
  const [consolidado, setConsolidado] = useState<GTLitoralIndicadoresConsolidados | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const periodosDisponiveis = useMemo(
    () => gtLitoralService.getPeriodosDisponiveis().sort(),
    [],
  )

  const fetchData = useCallback(
    async (nextFilters: GTLitoralFilters | undefined, options?: RefetchOptions) => {
      const ignoreCache = options?.ignoreCache ?? false
      const cacheKey = buildCacheKey(nextFilters)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!ignoreCache && municipiosCache.has(cacheKey) && consolidadoCache.has(cacheKey)) {
        setMunicipios(cloneMunicipios(municipiosCache.get(cacheKey)!))
        setConsolidado(cloneConsolidado(consolidadoCache.get(cacheKey)!))
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [municipiosResponse, consolidadoResponse] = await Promise.all([
          gtLitoralService.getMunicipios(nextFilters, { signal: controller.signal }),
          gtLitoralService.getIndicadoresConsolidados(
            { periodo: nextFilters?.periodo },
            { signal: controller.signal },
          ),
        ])

        if (controller.signal.aborted) {
          return
        }

        municipiosCache.set(cacheKey, cloneMunicipios(municipiosResponse))
        consolidadoCache.set(cacheKey, cloneConsolidado(consolidadoResponse))

        setMunicipios(cloneMunicipios(municipiosResponse))
        setConsolidado(cloneConsolidado(consolidadoResponse))
        setError(null)
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        const normalizedError =
          err instanceof Error ? err : new Error(DEFAULT_ERROR_MESSAGE)

        setError(normalizedError)
        setMunicipios(null)
        setConsolidado(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    void fetchData(filters)

    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, filters])

  const updateFilters = useCallback(
    (nextFilters: GTLitoralFilters | undefined) => {
      const normalized =
        nextFilters === undefined ? undefined : ({ ...nextFilters } as GTLitoralFilters)

      setFiltersState((previous) => {
        const previousKey = buildCacheKey(previous)
        const nextKey = buildCacheKey(normalized)
        if (previousKey === nextKey) {
          return previous ?? normalized
        }

        return normalized
      })
    },
    [],
  )

  const refetch = useCallback(
    async (options?: RefetchOptions) => {
      await fetchData(filters, { ignoreCache: options?.ignoreCache ?? true })
    },
    [fetchData, filters],
  )

  const getMunicipioById = useCallback(
    async (id: string, options?: GTLitoralRequestOptions) => {
      try {
        return await gtLitoralService.getMunicipioById(id, options)
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(DEFAULT_ERROR_MESSAGE)
        setError(normalizedError)
        throw normalizedError
      }
    },
    [],
  )

  const getIndicadoresConsolidados = useCallback(
    async (
      filtros?: { periodo?: string },
      options?: GTLitoralRequestOptions,
    ): Promise<GTLitoralIndicadoresConsolidados> => {
      try {
        return await gtLitoralService.getIndicadoresConsolidados(filtros, options)
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(DEFAULT_ERROR_MESSAGE)
        setError(normalizedError)
        throw normalizedError
      }
    },
    [],
  )

  return {
    data: municipios,
    consolidado,
    isLoading,
    error,
    filters,
    periodosDisponiveis,
    setFilters: updateFilters,
    refetch,
    getMunicipioById,
    getIndicadoresConsolidados,
  }
}

export function __resetGTLitoralCache(): void {
  municipiosCache.clear()
  consolidadoCache.clear()
}

export {
  GTLitoralNotFoundError,
  GTLitoralTimeoutError,
  GTLitoralValidationError,
}
