import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { FeatureCollection } from '@napi-aguas/shared'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MobileIndicatorsSheet } from '@/components/indicators/MobileIndicatorsSheet'
import { IndicatorBreadcrumb } from '@/components/indicators/IndicatorBreadcrumb'
import { InteractiveMap } from '@/components/map/InteractiveMap'
import { useIndicatorData } from '@/hooks/useIndicatorData'
import { useIndicators } from '@/hooks/useIndicators'
import { useAppStore } from '@/stores/useAppStore'
import { useMunicipioGeometries } from '@/hooks/useMunicipioGeometries'
import { normalizeFeatureCollection } from '@/lib/utils/map-utils'
import { VULNERABILITY_COLOR_SCALE } from '@/utils/scaleUtils'
import type { IndicatorNode } from '@/types/indicators'
import type { MapLayer } from '@/types/map.types'
import { GTType } from '@napi-aguas/shared'

const WORKGROUP_ID = 'agua-doce'

export const AguaDocePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: indicatorTree } = useIndicators(WORKGROUP_ID)
  const selectedIndicatorId = useAppStore(
    (state) => state.selectedIndicatorIdByWorkgroup[WORKGROUP_ID] ?? null,
  )
  const setSelectedIndicator = useAppStore((state) => state.setSelectedIndicator)

  const isSyncingFromStateRef = useRef(false)

  const indicatorFromUrl = searchParams.get('indicator')

  const indicatorIdExists = useMemo(() => {
    if (!indicatorTree || !indicatorFromUrl) {
      return false
    }

    return hasIndicator(indicatorTree, indicatorFromUrl)
  }, [indicatorFromUrl, indicatorTree])

  useEffect(() => {
    if (!indicatorTree) {
      return
    }

    if (selectedIndicatorId === indicatorFromUrl) {
      return
    }

    if (selectedIndicatorId) {
      isSyncingFromStateRef.current = true
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('indicator', selectedIndicatorId)
          return next
        },
        { replace: true },
      )
    } else if (indicatorFromUrl) {
      isSyncingFromStateRef.current = true
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('indicator')
          return next
        },
        { replace: true },
      )
    }
  }, [indicatorFromUrl, indicatorTree, selectedIndicatorId, setSearchParams])

  useEffect(() => {
    if (isSyncingFromStateRef.current) {
      isSyncingFromStateRef.current = false
      return
    }

    if (!indicatorFromUrl) {
      if (selectedIndicatorId !== null) {
        setSelectedIndicator(WORKGROUP_ID, null)
      }
      return
    }

    if (!indicatorTree) {
      return
    }

    if (indicatorIdExists) {
      if (indicatorFromUrl !== selectedIndicatorId) {
        setSelectedIndicator(WORKGROUP_ID, indicatorFromUrl)
      }
    } else {
      if (selectedIndicatorId !== null) {
        setSelectedIndicator(WORKGROUP_ID, null)
      }
      isSyncingFromStateRef.current = true
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('indicator')
          return next
        },
        { replace: true },
      )
    }
  }, [
    indicatorFromUrl,
    indicatorIdExists,
    indicatorTree,
    selectedIndicatorId,
    setSearchParams,
    setSelectedIndicator,
  ])

  // Selecionar automaticamente o índice principal ao carregar a página
  useEffect(() => {
    if (!indicatorTree || indicatorTree.length === 0) {
      return
    }

    // Se não há indicador na URL e nenhum selecionado, selecionar o primeiro (índice principal)
    if (!indicatorFromUrl && selectedIndicatorId === null) {
      const mainIndex = indicatorTree[0]
      if (mainIndex) {
        setSelectedIndicator(WORKGROUP_ID, mainIndex.id)
      }
    }
  }, [indicatorTree, indicatorFromUrl, selectedIndicatorId, setSelectedIndicator])

  const {
    data: indicatorData,
    isLoading: isIndicatorLoading,
    error: indicatorError,
    thresholds: indicatorThresholds,
    refetch: refetchIndicator,
  } = useIndicatorData(WORKGROUP_ID, selectedIndicatorId, { enabled: Boolean(selectedIndicatorId) })

  // Buscar geometrias de municípios para camada de fundo
  const {
    geometries: municipioGeometries,
    loading: municipioLoading,
    error: municipioError,
    refetch: refetchMunicipios,
  } = useMunicipioGeometries()

  // Buscar o nome do indicador selecionado na árvore
  const selectedIndicatorName = useMemo(() => {
    if (!indicatorTree || !selectedIndicatorId) {
      return 'Indicador'
    }

    const findIndicatorName = (nodes: IndicatorNode[], targetId: string): string | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node.name
        }

        if (node.children.length > 0) {
          const found = findIndicatorName(node.children, targetId)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    return findIndicatorName(indicatorTree, selectedIndicatorId) ?? 'Indicador'
  }, [indicatorTree, selectedIndicatorId])

  // Construir camadas para o mapa
  const mapLayers = useMemo(() => {
    const layers: MapLayer[] = []

    // Camada 1: Municípios (fundo cinza claro)
    if (municipioGeometries) {
      const normalized = normalizeFeatureCollection(
        municipioGeometries as unknown as FeatureCollection,
      )
      if (normalized) {
        layers.push({
          id: 'municipios-background',
          type: 'geojson',
          data: normalized,
          visible: true,
          label: 'Municípios',
          zIndex: 0,
          metadata: {
            description: 'Limites municipais do Paraná',
          },
          simplifyTolerance: 0.0008,
          style: {
            mode: 'simple',
            fillColor: '#e2e8f0',
            opacity: 0.1,
            lineColor: '#475569',
            lineWidth: 1,
          },
        })
      }
    }

    // Camada 2: Indicador selecionado (subbacias com cores)
    if (indicatorData) {
      const normalized = normalizeFeatureCollection(indicatorData)
      if (normalized) {
        const scale = indicatorThresholds
          ? {
              domain: [indicatorThresholds.min ?? 0, indicatorThresholds.max ?? 1] as [
                number,
                number,
              ],
              colors: VULNERABILITY_COLOR_SCALE,
              // Remover stops para permitir interpolação contínua de cores
              // A função getColorFromScale irá interpolar entre as 5 cores automaticamente
              noDataColor: '#e2e8f0',
            }
          : null

        layers.push({
          id: 'indicator-choropleth',
          type: 'geojson',
          data: normalized,
          visible: true,
          label: 'Indicador selecionado',
          zIndex: 1,
          metadata: {
            description: 'Subbacias com valores do indicador',
          },
          legend: {
            title: selectedIndicatorName,
            unit: indicatorData.metadata.unit ?? null,
            lastUpdated: indicatorData.metadata.lastUpdated ?? null,
            showNoData: true,
            // Adicionar thresholds para a legenda exibir os valores
            thresholds: indicatorThresholds
              ? {
                  min: indicatorThresholds.min,
                  q1: indicatorThresholds.q1,
                  median: indicatorThresholds.median,
                  q3: indicatorThresholds.q3,
                  max: indicatorThresholds.max,
                }
              : undefined,
          },
          simplifyTolerance: 0.0005,
          style: scale
            ? {
                mode: 'choropleth',
                colorScale: scale,
                property: 'value',
                outlineColor: '#1f2937',
                outlineWidth: 1.5,
              }
            : undefined,
        })
      }
    }

    return layers
  }, [municipioGeometries, indicatorData, indicatorThresholds, selectedIndicatorName])

  const isLoading = municipioLoading || isIndicatorLoading
  const combinedError = municipioError ?? indicatorError

  const refetch = async () => {
    if (municipioError) {
      refetchMunicipios()
    }
    if (indicatorError) {
      await refetchIndicator()
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop (≥1024px): Sidebar tradicional | Mobile (<1024px): Bottom Sheet */}
        <MobileIndicatorsSheet workgroupId={WORKGROUP_ID} />

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <IndicatorBreadcrumb workgroupId={WORKGROUP_ID} />
            <div className="px-4 py-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/agua-doce/graficos" aria-label="Ver gráficos por comitê de bacia">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                    aria-hidden="true"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  Gráficos
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden pb-0 lg:pb-0">
            <div className="flex h-full min-h-0 w-full flex-col gap-4 pb-20 lg:pb-0">
              {combinedError ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro ao carregar dados</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-neutral-700 dark:text-neutral-200">
                      {combinedError.message}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void refetch()
                        }}
                      >
                        Tentar novamente
                      </Button>
                      {indicatorError ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedIndicator(WORKGROUP_ID, null)}
                        >
                          Limpar seleção
                        </Button>
                      ) : null}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex-1 min-h-0 overflow-hidden rounded-none border-none bg-white dark:bg-neutral-950">
                <InteractiveMap
                  gtType={GTType.AGUA}
                  layers={mapLayers}
                  isLoading={isLoading}
                  externalError={combinedError}
                  refetch={refetch}
                  geometryType="polygon"
                  className="h-full min-h-0 rounded-none border-none bg-white dark:bg-neutral-950"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function hasIndicator(nodes: IndicatorNode[], targetId: string): boolean {
  return nodes.some((node) => {
    if (node.id === targetId) {
      return true
    }

    if (node.children.length > 0) {
      return hasIndicator(node.children, targetId)
    }

    return false
  })
}
