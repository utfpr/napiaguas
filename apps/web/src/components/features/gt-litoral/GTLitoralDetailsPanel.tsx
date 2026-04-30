import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import { Button } from '@/components/ui/button'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  WavesIcon,
  XIcon,
} from '@/components/ui/icons'
import {
  GT_LITORAL_INDICATOR_MAP,
  GTLITORAL_PERIOD_FORMATTER,
  type GTLitoralIndicatorKey,
} from '@/lib/gt-litoral/constants'
import { GT_LITORAL_COMPLEMENTARY_KEYS, MUNICIPIO_INDICATOR_VALUE_MAP } from '@/lib/gt-litoral/utils'

import { IndicatorChart } from './IndicatorChart'
import { IndicatorTrend } from './IndicatorTrend'

const PANEL_ROOT_ID = 'gt-litoral-details-root'

function ensurePanelRoot(): HTMLElement {
  let element = document.getElementById(PANEL_ROOT_ID)
  if (!element) {
    element = document.createElement('div')
    element.setAttribute('id', PANEL_ROOT_ID)
    document.body.appendChild(element)
  }
  return element
}

export function GTLitoralDetailsPanel() {
  const {
    isDetailsOpen,
    closeDetails,
    filteredMunicipios,
    activeMunicipio,
    setSelectedMunicipioId,
    selectedIndicatorKey,
    selectedIndicator,
    periodosDisponiveis,
    activeIndicatorValue,
  } = useGTLitoralContext()

  const municipioIndex = useMemo(() => {
    if (!activeMunicipio) {
      return -1
    }
    return filteredMunicipios.findIndex((municipio) => municipio.id === activeMunicipio.id)
  }, [activeMunicipio, filteredMunicipios])

  const previousMunicipio =
    municipioIndex > 0 ? filteredMunicipios[municipioIndex - 1] : null
  const nextMunicipio =
    municipioIndex >= 0 && municipioIndex < filteredMunicipios.length - 1
      ? filteredMunicipios[municipioIndex + 1]
      : null

  useEffect(() => {
    if (!isDetailsOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDetails()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDetails, isDetailsOpen])

  const dispatchNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && previousMunicipio) {
      setSelectedMunicipioId(previousMunicipio.id, { openDetails: true })
    } else if (direction === 'next' && nextMunicipio) {
      setSelectedMunicipioId(nextMunicipio.id, { openDetails: true })
    }
  }

  const complementaryData =
    activeMunicipio?.indicadoresComplementares != null
      ? GT_LITORAL_COMPLEMENTARY_KEYS.map((entry) => ({
          label: entry.label,
          value: Number(
            (activeMunicipio.indicadoresComplementares[entry.key] as number | undefined) ?? 0,
          ),
        }))
      : []

  const indicadorAtual = MUNICIPIO_INDICATOR_VALUE_MAP[selectedIndicatorKey](activeMunicipio)
  const indicadorLabel = GT_LITORAL_INDICATOR_MAP[selectedIndicatorKey].label

  if (typeof document === 'undefined') {
    return null
  }

  if (!isDetailsOpen) {
    return null
  }

  const panelRoot = ensurePanelRoot()

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        role="presentation"
        onClick={closeDetails}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out md:w-[420px] lg:w-[520px] dark:bg-neutral-900"
        aria-label="Painel de detalhes do município"
      >
        {activeMunicipio ? (
          <div className="flex h-full flex-col">
            <header className="border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Painel de detalhes
                  </p>
                  <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {activeMunicipio.nome}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {indicadorLabel}: {indicadorAtual != null ? indicadorAtual.toFixed(2) : '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => dispatchNavigation('prev')}
                    disabled={!previousMunicipio}
                    aria-label="Município anterior"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => dispatchNavigation('next')}
                    disabled={!nextMunicipio}
                    aria-label="Próximo município"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={closeDetails}
                    aria-label="Fechar painel de detalhes"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-6 px-6 py-6">
              <section className="grid gap-4 rounded-xl border border-neutral-200 bg-sky-50/60 px-4 py-4 dark:border-sky-900/40 dark:bg-sky-900/20">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
                    <WavesIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-sky-600 dark:text-sky-300">
                      Indicador selecionado
                    </p>
                    <p className="text-2xl font-semibold text-sky-700 dark:text-sky-100">
                      {GTLITORAL_PERIOD_FORMATTER[selectedIndicator.format](
                        activeIndicatorValue(activeMunicipio),
                      )}
                    </p>
                    <p className="text-sm text-sky-600/80 dark:text-sky-200/80">
                      {selectedIndicator.description}
                    </p>
                  </div>
                </div>
              </section>

              <IndicatorTrend
                municipioId={activeMunicipio.id}
                indicatorKey={selectedIndicatorKey}
                periodos={periodosDisponiveis}
              />

              <div className="grid gap-4">
                <IndicatorChart
                  title="Indicadores complementares"
                  description="Indicadores comparativos padronizados (0-1) para risco e vulnerabilidade costeira."
                  data={complementaryData}
                  variant="bar"
                />
                <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    Perfil socioeconômico
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Nível socioeconômico:{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {activeMunicipio.indicadoresComplementares.nivelSocioeconomico.toUpperCase()}
                    </span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <p>
                      População em zona de risco:{' '}
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {new Intl.NumberFormat('pt-BR').format(
                          activeMunicipio.indicadores.populacao_zona_risco,
                        )}
                      </span>
                    </p>
                    <p>
                      Elevação costeira média:{' '}
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {activeMunicipio.indicadores.elevacao_costeira_m.toFixed(2)} m
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Fontes de dados
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                  {activeMunicipio.fontes_dados?.map((fonte) => (
                    <li key={fonte}>{fonte}</li>
                  )) ?? (
                    <li>Fontes não informadas para este município.</li>
                  )}
                </ul>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Indicadores atuais
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {(
                    Object.keys(GT_LITORAL_INDICATOR_MAP) as GTLitoralIndicatorKey[]
                  ).map((key) => {
                    const option = GT_LITORAL_INDICATOR_MAP[key]
                    const value = MUNICIPIO_INDICATOR_VALUE_MAP[key](activeMunicipio)
                    return (
                      <p key={key} className="flex items-center justify-between gap-4">
                        <span>{option.label}</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {GTLITORAL_PERIOD_FORMATTER[option.format](value)}
                          {option.unit ? ` ${option.unit}` : ''}
                        </span>
                      </p>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Indicadores de população exposta
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <UsersIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">População total</p>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {new Intl.NumberFormat('pt-BR').format(
                          activeMunicipio.indicadores.populacao_zona_risco,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <WavesIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Risco de inundação</p>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {GTLITORAL_PERIOD_FORMATTER.percentage(
                          activeMunicipio.indicadores.risco_inundacao,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-neutral-500 dark:text-neutral-400">
            <p>Selecione um município no mapa ou na lista para visualizar os detalhes.</p>
            <Button variant="outline" onClick={closeDetails}>
              Fechar painel
            </Button>
          </div>
        )}
      </aside>
    </>,
    panelRoot,
  )
}
