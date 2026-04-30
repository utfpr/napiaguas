import { useMemo } from 'react'

import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import { Button } from '@/components/ui/button'
import { MapPinIcon, TrendingUpIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GT_LITORAL_INDICATOR_MAP,
  GTLITORAL_PERIOD_FORMATTER,
  type GTLitoralIndicatorKey,
} from '@/lib/gt-litoral/constants'
import { MUNICIPIO_INDICATOR_VALUE_MAP } from '@/lib/gt-litoral/utils'

// Type que representa campos sortáveis da tabela
// Deve ser subset de SortField do GTLitoralContext
type SortableField = 'nome' | 'populacao_zona_risco' | 'risco_inundacao' | 'indice_integrado'

const COLUMN_CONFIG: Array<{
  heading: string
  field: SortableField
  description?: string
}> = [
  {
    heading: 'Município',
    field: 'nome',
  },
  {
    heading: 'População em zona de risco',
    field: 'populacao_zona_risco',
    description: 'Habitantes diretamente expostos a eventos costeiros críticos.',
  },
  {
    heading: 'Risco de inundação',
    field: 'risco_inundacao',
    description: 'Probabilidade de eventos extremos considerando 2024.',
  },
  {
    heading: 'Índice integrado',
    field: 'indice_integrado',
    description: 'Indicador composto balanceado entre impacto e resiliência.',
  },
]

export function GTLitoralMunicipiosList({ className }: { className?: string }) {
  const {
    filteredMunicipios,
    isLoading,
    error,
    setSelectedMunicipioId,
    selectedMunicipioId,
    sort,
    setSort,
    searchTerm,
  } = useGTLitoralContext()

  const emptyStateMessage = useMemo(() => {
    if (!searchTerm.trim()) {
      return 'Nenhum município corresponde aos filtros selecionados.'
    }
    return `Nenhum município encontrado para "${searchTerm}".`
  }, [searchTerm])

  if (isLoading) {
    return (
      <div className={className} data-testid="gtlitoral-municipios-list">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className} data-testid="gtlitoral-municipios-list">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
          <p className="font-medium text-destructive">Erro ao carregar lista de municípios</p>
          <p className="mt-2 text-sm text-destructive/80">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className} data-testid="gtlitoral-municipios-list">
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <MapPinIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Municípios monitorados
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Clique em uma linha para abrir o painel de detalhes e explorar indicadores.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setSort('nome')}
            >
              Ordenar por nome
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setSort('risco_inundacao')}
            >
              <TrendingUpIcon className="h-4 w-4" aria-hidden="true" />
              Ordenar por risco
            </Button>
          </div>
        </header>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60">
              <tr>
                {COLUMN_CONFIG.map((column) => {
                  const isActive = sort.field === column.field
                  const indicator =
                    column.field === 'nome'
                      ? null
                      : GT_LITORAL_INDICATOR_MAP[column.field as GTLitoralIndicatorKey]
                  const label = indicator?.label ?? column.heading

                  return (
                    <th
                      key={column.field}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2"
                        onClick={() => setSort(column.field)}
                      >
                        {label}
                        {isActive ? (
                          <span className="text-[10px] font-medium text-neutral-500">
                            {sort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        ) : null}
                      </button>
                      {column.description ? (
                        <p className="mt-1 max-w-xs text-[11px] text-neutral-400 dark:text-neutral-500">
                          {column.description}
                        </p>
                      ) : null}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white/60 dark:divide-neutral-800 dark:bg-neutral-900/40">
              {filteredMunicipios.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_CONFIG.length}
                    className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                filteredMunicipios.map((municipio) => {
                  const isSelected = municipio.id === selectedMunicipioId

                  const formatValue = (field: SortableField): string | number => {
                    if (field === 'nome') {
                      return municipio.nome
                    }

                    // SortableField (exceto 'nome') é subset de GTLitoralIndicatorKey
                    const indicatorKey = field as GTLitoralIndicatorKey
                    const option = GT_LITORAL_INDICATOR_MAP[indicatorKey]
                    const value = MUNICIPIO_INDICATOR_VALUE_MAP[indicatorKey](municipio)
                    if (value == null) {
                      return '—'
                    }
                    return GTLITORAL_PERIOD_FORMATTER[option.format](value)
                  }

                  return (
                    <tr
                      key={municipio.id}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-sky-50/80 text-sky-900 dark:bg-sky-900/20 dark:text-sky-100'
                          : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
                      }`}
                      onClick={() => setSelectedMunicipioId(municipio.id, { openDetails: true })}
                    >
                      {COLUMN_CONFIG.map((column) => (
                        <td key={column.field} className="px-4 py-3 text-sm">
                          {formatValue(column.field)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
