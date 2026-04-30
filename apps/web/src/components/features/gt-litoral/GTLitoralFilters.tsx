import { useMemo } from 'react'

import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterIcon, XIcon } from '@/components/ui/icons'
import {
  DEFAULT_GT_LITORAL_INDICATOR,
  GT_LITORAL_INDICATOR_OPTIONS,
  GT_LITORAL_INDICATOR_MAP,
} from '@/lib/gt-litoral/constants'
import type { GTLitoralPeriodo } from '@/types/gt-litoral.types'

export function GTLitoralFilters() {
  const {
    municipios,
    periodo,
    setPeriodo,
    periodosDisponiveis,
    selectedIndicatorKey,
    setSelectedIndicatorKey,
    selectedMunicipiosFilter,
    toggleMunicipioFilter,
    setMunicipioFilter,
    searchTerm,
    setSearchTerm,
    resetFilters,
    filtersCount,
  } = useGTLitoralContext()

  const orderedMunicipios = useMemo(() => {
    if (!municipios) {
      return []
    }

    return [...municipios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [municipios])

  const selectedIndicator = GT_LITORAL_INDICATOR_MAP[selectedIndicatorKey]

  return (
    <section
      className="rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60"
      data-testid="gtlitoral-filters"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
            <FilterIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Filtros avançados
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ajuste os recortes para atualizar mapa, dashboard e lista.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filtersCount > 0 ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
              {filtersCount} filtro{filtersCount > 1 ? 's' : ''} ativo{filtersCount > 1 ? 's' : ''}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={filtersCount === 0 && selectedIndicatorKey === DEFAULT_GT_LITORAL_INDICATOR}
          >
            Limpar tudo
          </Button>
        </div>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="gtlitoral-period" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Período
          </label>
          <select
            id="gtlitoral-period"
            className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            value={periodo ?? ''}
            onChange={(event) => {
              const nextValue = event.target.value
              setPeriodo(nextValue ? (nextValue as GTLitoralPeriodo) : undefined)
            }}
          >
            {periodo === undefined ? <option value="">Último período</option> : null}
            {periodosDisponiveis.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="gtlitoral-indicator" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Indicador do mapa
          </label>
          <select
            id="gtlitoral-indicator"
            className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            value={selectedIndicatorKey}
            onChange={(event) => {
              setSelectedIndicatorKey(event.target.value as typeof selectedIndicatorKey)
            }}
          >
            {GT_LITORAL_INDICATOR_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {selectedIndicator.description ?? 'Selecione um indicador para análise no mapa.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="gtlitoral-search" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Busca por município
          </label>
          <Input
            id="gtlitoral-search"
            placeholder="Pesquisar por nome"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Municípios do GT Litoral
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setMunicipioFilter([])}
            disabled={selectedMunicipiosFilter.length === 0}
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
            Limpar seleção
          </Button>
        </div>
        <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          {orderedMunicipios.length === 0 ? (
            <p className="text-sm text-neutral-500">Carregando municípios...</p>
          ) : (
            orderedMunicipios.map((municipio) => {
              const checked = selectedMunicipiosFilter.includes(municipio.id)
              return (
                <label
                  key={municipio.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-2 text-sm transition hover:border-sky-200 hover:bg-sky-50 dark:hover:border-sky-900/40 dark:hover:bg-sky-900/20"
                >
                  <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      className="accent-sky-600"
                      checked={checked}
                      onChange={() => toggleMunicipioFilter(municipio.id)}
                    />
                    {municipio.nome}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Intl.NumberFormat('pt-BR').format(
                      municipio.indicadores.populacao_zona_risco,
                    )}{' '}
                    em risco
                  </span>
                </label>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
