import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import { useGTLitoral } from '@/hooks/useGTLitoral'
import {
  DEFAULT_GT_LITORAL_INDICATOR,
  GT_LITORAL_INDICATOR_MAP,
  GT_LITORAL_INDICATOR_OPTIONS,
  type GTLitoralIndicatorKey,
  type GTLitoralIndicatorOption,
} from '@/lib/gt-litoral/constants'
import { calculateConsolidadoFromMunicipios } from '@/lib/gt-litoral/utils'
import type {
  GTLitoralIndicadoresConsolidados,
  GTLitoralMunicipioDetalhado,
  GTLitoralPeriodo,
} from '@/types/gt-litoral.types'

type SortField =
  | 'nome'
  | 'risco_inundacao'
  | 'populacao_zona_risco'
  | 'indice_integrado'

type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField
  direction: SortDirection
}

interface GTLitoralContextValue {
  municipios: GTLitoralMunicipioDetalhado[] | null
  filteredMunicipios: GTLitoralMunicipioDetalhado[]
  consolidado: GTLitoralIndicadoresConsolidados | null
  filteredConsolidado: GTLitoralIndicadoresConsolidados | null
  isLoading: boolean
  error: Error | null
  periodo: GTLitoralPeriodo | undefined
  periodosDisponiveis: GTLitoralPeriodo[]
  setPeriodo: (periodo: GTLitoralPeriodo | undefined) => void
  selectedIndicatorKey: GTLitoralIndicatorKey
  selectedIndicator: GTLitoralIndicatorOption
  setSelectedIndicatorKey: (key: GTLitoralIndicatorKey) => void
  selectedMunicipioId: string | null
  setSelectedMunicipioId: (id: string | null, options?: { openDetails?: boolean }) => void
  selectedMunicipiosFilter: string[]
  toggleMunicipioFilter: (id: string) => void
  setMunicipioFilter: (ids: string[]) => void
  resetFilters: () => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  sort: SortState
  setSort: (field: SortField) => void
  isDetailsOpen: boolean
  openDetails: (municipioId?: string) => void
  closeDetails: () => void
  refetch: (options?: { ignoreCache?: boolean }) => Promise<void>
  setFilters: ReturnType<typeof useGTLitoral>['setFilters']
  getMunicipioById: ReturnType<typeof useGTLitoral>['getMunicipioById']
  getIndicadoresConsolidados: ReturnType<typeof useGTLitoral>['getIndicadoresConsolidados']
  filtersCount: number
  activeMunicipio: GTLitoralMunicipioDetalhado | null
  activeIndicatorValue: (municipio: GTLitoralMunicipioDetalhado | null) => number | null
}

const GTLitoralContext = createContext<GTLitoralContextValue | undefined>(undefined)

const SORTABLE_FIELDS: SortField[] = [
  'nome',
  'risco_inundacao',
  'populacao_zona_risco',
  'indice_integrado',
]

const parseSortParam = (value: string | null): SortState => {
  if (!value) {
    return { field: 'nome', direction: 'asc' }
  }

  const [field, direction] = value.split(':')
  if (!SORTABLE_FIELDS.includes(field as SortField)) {
    return { field: 'nome', direction: 'asc' }
  }

  if (direction !== 'asc' && direction !== 'desc') {
    return { field: 'nome', direction: 'asc' }
  }

  return { field: field as SortField, direction }
}

const buildSortParam = (sort: SortState): string => `${sort.field}:${sort.direction}`

const serializeMunicipios = (ids: string[]): string | null => {
  if (ids.length === 0) {
    return null
  }
  return ids.join(',')
}

const parseMunicipiosParam = (value: string | null): string[] => {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

export function GTLitoralProvider({ children }: PropsWithChildren) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [periodo, setPeriodoState] = useState<GTLitoralPeriodo | undefined>(() => {
    const periodoParam = searchParams.get('periodo')
    return periodoParam ? (periodoParam as GTLitoralPeriodo) : undefined
  })

  const [selectedIndicatorKey, setSelectedIndicatorKeyState] =
    useState<GTLitoralIndicatorKey>(() => {
      const indicatorParam = searchParams.get('indicator')
      if (indicatorParam && indicatorParam in GT_LITORAL_INDICATOR_MAP) {
        return indicatorParam as GTLitoralIndicatorKey
      }
      return DEFAULT_GT_LITORAL_INDICATOR
    })

  const [selectedMunicipiosFilter, setSelectedMunicipiosFilter] = useState<string[]>(() =>
    parseMunicipiosParam(searchParams.get('municipios')),
  )

  const [selectedMunicipioId, setSelectedMunicipioIdState] = useState<string | null>(() => {
    const selectedParam = searchParams.get('municipio')
    return selectedParam ? selectedParam : null
  })

  const [searchTerm, setSearchTermState] = useState(() => searchParams.get('q') ?? '')

  const [sort, setSortState] = useState<SortState>(() => parseSortParam(searchParams.get('sort')))

  const [isDetailsOpen, setIsDetailsOpen] = useState(() => searchParams.get('panel') === 'details')

  const {
    data: municipios,
    consolidado,
    isLoading,
    error,
    periodosDisponiveis,
    setFilters,
    refetch,
    getMunicipioById,
    getIndicadoresConsolidados,
  } = useGTLitoral(periodo ? { periodo } : undefined)

  useEffect(() => {
    if (!periodosDisponiveis.length) {
      return
    }

    if (periodo && !periodosDisponiveis.includes(periodo)) {
      setPeriodoState(periodosDisponiveis[periodosDisponiveis.length - 1])
      return
    }

    if (!periodo) {
      setPeriodoState(periodosDisponiveis[periodosDisponiveis.length - 1])
    }
  }, [periodo, periodosDisponiveis])

  useEffect(() => {
    setFilters(periodo ? { periodo } : undefined)
  }, [periodo, setFilters])

  useEffect(() => {
    if (!municipios) {
      return
    }

    const validIds = new Set(municipios.map((municipio) => municipio.id))

    if (selectedMunicipioId && !validIds.has(selectedMunicipioId)) {
      setSelectedMunicipioIdState(null)
    }

    if (selectedMunicipiosFilter.length > 0) {
      const filtered = selectedMunicipiosFilter.filter((id) => validIds.has(id))
      if (filtered.length !== selectedMunicipiosFilter.length) {
        setSelectedMunicipiosFilter(filtered)
      }
    }
  }, [municipios, selectedMunicipioId, selectedMunicipiosFilter])

  const filteredMunicipios = useMemo(() => {
    if (!municipios) {
      return []
    }

    let collection = [...municipios]

    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (normalizedSearch.length > 0) {
      collection = collection.filter((municipio) =>
        municipio.nome.toLowerCase().includes(normalizedSearch),
      )
    }

    if (selectedMunicipiosFilter.length > 0) {
      const selectedIds = new Set(selectedMunicipiosFilter)
      collection = collection.filter((municipio) => selectedIds.has(municipio.id))
    }

    const compare = (left: GTLitoralMunicipioDetalhado, right: GTLitoralMunicipioDetalhado) => {
      switch (sort.field) {
        case 'risco_inundacao':
          return left.indicadores.risco_inundacao - right.indicadores.risco_inundacao
        case 'populacao_zona_risco':
          return left.indicadores.populacao_zona_risco - right.indicadores.populacao_zona_risco
        case 'indice_integrado': {
          const leftValue = left.indicadores.indice_integrado ?? 0
          const rightValue = right.indicadores.indice_integrado ?? 0
          return leftValue - rightValue
        }
        case 'nome':
        default:
          return left.nome.localeCompare(right.nome, 'pt-BR')
      }
    }

    collection.sort((a, b) => {
      const result = compare(a, b)
      return sort.direction === 'asc' ? result : -result
    })

    return collection
  }, [municipios, searchTerm, selectedMunicipiosFilter, sort])

  const filteredConsolidado = useMemo(() => {
    if (!filteredMunicipios.length) {
      return null
    }

    return calculateConsolidadoFromMunicipios(
      filteredMunicipios,
      consolidado?.periodo ?? periodo ?? undefined,
    )
  }, [consolidado?.periodo, filteredMunicipios, periodo])

  useEffect(() => {
    if (!filteredMunicipios.length) {
      return
    }

    if (!selectedMunicipioId) {
      setSelectedMunicipioIdState(filteredMunicipios[0].id)
    }
  }, [filteredMunicipios, selectedMunicipioId])

  const filtersCount = useMemo(() => {
    let count = 0
    if (selectedMunicipiosFilter.length > 0) {
      count += 1
    }
    if (searchTerm.trim().length > 0) {
      count += 1
    }
    if (sort.field !== 'nome' || sort.direction !== 'asc') {
      count += 1
    }
    return count
  }, [searchTerm, selectedMunicipiosFilter.length, sort.direction, sort.field])

  useEffect(() => {
    const nextParams = new URLSearchParams()

    if (periodo) {
      nextParams.set('periodo', periodo)
    }

    if (selectedIndicatorKey !== DEFAULT_GT_LITORAL_INDICATOR) {
      nextParams.set('indicator', selectedIndicatorKey)
    }

    const municipiosParam = serializeMunicipios(selectedMunicipiosFilter)
    if (municipiosParam) {
      nextParams.set('municipios', municipiosParam)
    }

    if (selectedMunicipioId) {
      nextParams.set('municipio', selectedMunicipioId)
    }

    if (searchTerm.trim().length > 0) {
      nextParams.set('q', searchTerm.trim())
    }

    if (sort.field !== 'nome' || sort.direction !== 'asc') {
      nextParams.set('sort', buildSortParam(sort))
    }

    if (isDetailsOpen) {
      nextParams.set('panel', 'details')
    }

    const nextString = nextParams.toString()
    if (nextString !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [
    isDetailsOpen,
    periodo,
    searchParams,
    searchTerm,
    selectedIndicatorKey,
    selectedMunicipioId,
    selectedMunicipiosFilter,
    setSearchParams,
    sort,
  ])

  const setSelectedIndicatorKey = useCallback((key: GTLitoralIndicatorKey) => {
    if (key === selectedIndicatorKey) {
      return
    }
    setSelectedIndicatorKeyState(key)
  }, [selectedIndicatorKey])

  const toggleMunicipioFilter = useCallback((id: string) => {
    setSelectedMunicipiosFilter((previous) => {
      const set = new Set(previous)
      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id)
      }
      return Array.from(set)
    })
  }, [])

  const setMunicipioFilter = useCallback((ids: string[]) => {
    setSelectedMunicipiosFilter(Array.from(new Set(ids)))
  }, [])

  const resetFilters = useCallback(() => {
    setSelectedMunicipiosFilter([])
    setSearchTermState('')
    setSortState({ field: 'nome', direction: 'asc' })
  }, [])

  const setSelectedMunicipioId = useCallback(
    (id: string | null, options?: { openDetails?: boolean }) => {
      setSelectedMunicipioIdState(id)
      if (options?.openDetails && id) {
        setIsDetailsOpen(true)
      }
    },
    [],
  )

  const setPeriodo = useCallback((value: GTLitoralPeriodo | undefined) => {
    setPeriodoState(value)
  }, [])

  const setSort = useCallback(
    (field: SortField) => {
      setSortState((previous) => {
        if (previous.field === field) {
          return {
            field,
            direction: previous.direction === 'asc' ? 'desc' : 'asc',
          }
        }
        return { field, direction: 'asc' }
      })
    },
    [],
  )

  const openDetails = useCallback(
    (municipioId?: string) => {
      if (municipioId) {
        setSelectedMunicipioIdState(municipioId)
      }
      setIsDetailsOpen(true)
    },
    [],
  )

  const closeDetails = useCallback(() => {
    setIsDetailsOpen(false)
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term)
  }, [])

  const selectedIndicator = useMemo(
    () => GT_LITORAL_INDICATOR_MAP[selectedIndicatorKey],
    [selectedIndicatorKey],
  )

  const activeMunicipio = useMemo(() => {
    if (!filteredMunicipios.length) {
      return null
    }

    return (
      filteredMunicipios.find((municipio) => municipio.id === selectedMunicipioId) ??
      filteredMunicipios[0] ??
      null
    )
  }, [filteredMunicipios, selectedMunicipioId])

  const activeIndicatorValue = useCallback(
    (municipio: GTLitoralMunicipioDetalhado | null) => {
      if (!municipio) {
        return null
      }
      const value = municipio.indicadores[selectedIndicatorKey]
      return typeof value === 'number' ? value : null
    },
    [selectedIndicatorKey],
  )

  const contextValue = useMemo<GTLitoralContextValue>(
    () => ({
      municipios,
      filteredMunicipios,
      consolidado,
      filteredConsolidado,
      isLoading,
      error,
      periodo,
      periodosDisponiveis,
      setPeriodo,
      selectedIndicatorKey,
      selectedIndicator,
      setSelectedIndicatorKey,
      selectedMunicipioId,
      setSelectedMunicipioId,
      selectedMunicipiosFilter,
      toggleMunicipioFilter,
      setMunicipioFilter,
      resetFilters,
      searchTerm,
      setSearchTerm,
      sort,
      setSort,
      isDetailsOpen,
      openDetails,
      closeDetails,
      refetch,
      setFilters,
      getMunicipioById,
      getIndicadoresConsolidados,
      filtersCount,
      activeMunicipio,
      activeIndicatorValue,
    }),
    [
      municipios,
      filteredMunicipios,
      consolidado,
      filteredConsolidado,
      isLoading,
      error,
      periodo,
      periodosDisponiveis,
      setPeriodo,
      selectedIndicatorKey,
      selectedIndicator,
      setSelectedIndicatorKey,
      selectedMunicipioId,
      setSelectedMunicipioId,
      selectedMunicipiosFilter,
      toggleMunicipioFilter,
      setMunicipioFilter,
      resetFilters,
      searchTerm,
      setSearchTerm,
      sort,
      setSort,
      isDetailsOpen,
      openDetails,
      closeDetails,
      refetch,
      setFilters,
      getMunicipioById,
      getIndicadoresConsolidados,
      filtersCount,
      activeMunicipio,
      activeIndicatorValue,
    ],
  )

  return <GTLitoralContext.Provider value={contextValue}>{children}</GTLitoralContext.Provider>
}

export function useGTLitoralContext(): GTLitoralContextValue {
  const context = useContext(GTLitoralContext)
  if (!context) {
    throw new Error('useGTLitoralContext deve ser utilizado dentro de GTLitoralProvider')
  }
  return context
}
