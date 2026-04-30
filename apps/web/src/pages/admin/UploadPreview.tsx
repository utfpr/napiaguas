import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DataPreview } from '../../components/features/admin/DataPreview'
import { UploadStatistics } from '../../components/features/admin/UploadStatistics'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/auth.store'

interface PreviewData {
  uploadLog: {
    id: string
    filename: string
    fileSizeBytes: number
    mimeType: string
    workgroupId: string
  }
  statistics: {
    featuresCount: number
    indicatorsDetected: number
    valueRanges: Array<{
      indicatorId: string
      min: number
      max: number
    }>
  }
  sampleFeatures: Array<{
    hybasId: string
    [key: string]: any
  }>
  previewGeojson: {
    type: 'FeatureCollection'
    features: any[]
  }
}

function transformSampleFeatures(sampleFeatures: Array<{ hybasId: string; [key: string]: any }>) {
  return sampleFeatures.map((feature) => {
    const indicatorKeys = Object.keys(feature).filter(key => key !== 'hybasId')
    const firstIndicatorValue = indicatorKeys[0] ? feature[indicatorKeys[0]] : 0

    return {
      id: feature.hybasId,
      name: feature.hybasId,
      indicator_value: Number(firstIndicatorValue),
      ...feature
    }
  })
}

// Função para calcular cor baseada em valor de vulnerabilidade
const calculateColor = (value: number, min: number, max: number): string => {
  if (max === min) return '#00CC66'
  const normalized = (value - min) / (max - min)

  if (normalized <= 0.25) return '#00CC66' // Verde - Baixa vulnerabilidade
  if (normalized <= 0.5) return '#FFD700'  // Amarelo - Vulnerabilidade média
  if (normalized <= 0.75) return '#FB8500' // Laranja - Vulnerabilidade média-alta
  return '#D62828' // Vermelho - Alta vulnerabilidade
}

// Componente simplificado de mapa que recebe GeoJSON diretamente
function PreviewMapWithData({ geojsonData }: { geojsonData: any }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [-51.5, -25.5], // Centro do Paraná
      zoom: 6
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      if (!map.current) return

      // Calcular min/max para colorização
      const values = geojsonData.features.map(
        (f: any) => {
          const props = f.properties || {}
          // Pegar o primeiro valor numérico das propriedades
          const numericKeys = Object.keys(props).filter(k => typeof props[k] === 'number')
          return numericKeys.length > 0 ? props[numericKeys[0]] : 0
        }
      )
      const min = Math.min(...values)
      const max = Math.max(...values)

      // Adicionar cores às features
      const coloredGeojson = {
        ...geojsonData,
        features: geojsonData.features.map((feature: any) => {
          const props = feature.properties || {}
          const numericKeys = Object.keys(props).filter(k => typeof props[k] === 'number')
          const value = numericKeys.length > 0 ? props[numericKeys[0]] : 0

          return {
            ...feature,
            properties: {
              ...props,
              color: calculateColor(value, min, max)
            }
          }
        })
      }

      // Adicionar source
      map.current!.addSource('preview-data', {
        type: 'geojson',
        data: coloredGeojson
      })

      // Adicionar camada de preenchimento (polígonos)
      map.current!.addLayer({
        id: 'preview-fill',
        type: 'fill',
        source: 'preview-data',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.7
        }
      })

      // Adicionar camada de contorno
      map.current!.addLayer({
        id: 'preview-outline',
        type: 'line',
        source: 'preview-data',
        paint: {
          'line-color': '#333333',
          'line-width': 1
        }
      })

      // Ajustar bounds ao conteúdo
      if (geojsonData.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        geojsonData.features.forEach((feature: any) => {
          if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.type === 'Polygon'
              ? feature.geometry.coordinates[0]
              : feature.geometry.coordinates[0][0]
            coords.forEach((coord: number[]) => {
              bounds.extend(coord as [number, number])
            })
          }
        })
        map.current!.fitBounds(bounds, { padding: 50 })
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [geojsonData])

  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Mapa de Preview
      </h3>
      <div className="relative h-[500px] w-full rounded-lg border border-gray-200 overflow-hidden">
        <div ref={mapContainer} className="h-full w-full" />
      </div>

      {/* Legenda */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Legenda</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#00CC66' }} />
            <span className="text-sm text-gray-700">Baixa vulnerabilidade</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#FFD700' }} />
            <span className="text-sm text-gray-700">Vulnerabilidade média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#FB8500' }} />
            <span className="text-sm text-gray-700">Vulnerabilidade média-alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#D62828' }} />
            <span className="text-sm text-gray-700">Alta vulnerabilidade</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UploadPreview() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { accessToken } = useAuthStore()

  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const fetchPreview = async () => {
      if (!uploadId) {
        setError('ID de upload não fornecido')
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        if (!accessToken) {
          throw new Error('Usuário não autenticado')
        }

        const response = await fetch(`/api/v1/admin/upload/${uploadId}/preview`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error?.message || 'Falha ao carregar preview do upload')
        }

        const data = await response.json()
        setPreviewData(data)
      } catch (err) {
        console.error('Erro ao buscar preview:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [uploadId, accessToken])

  const handleConfirm = async () => {
    if (!uploadId || !previewData) return

    try {
      setIsCommitting(true)

      if (!accessToken) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`/api/v1/admin/upload/${uploadId}/commit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || 'Falha ao confirmar upload')
      }

      const result = await response.json()

      // Toast de sucesso
      toast({
        title: "Dados commitados com sucesso!",
        description: result.message || "Dados importados para produção.",
        variant: "default",
      })

      // Redirecionar para dashboard
      navigate('/admin/dashboard')
    } catch (err) {
      console.error('Erro ao confirmar upload:', err)

      // Mostrar erro formatado ao usuário
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao confirmar upload'
      toast({
        title: "Erro ao confirmar upload",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCommitting(false)
    }
  }

  const handleCancel = async () => {
    if (!uploadId) return

    const confirmed = window.confirm(
      'Tem certeza que deseja cancelar este upload? Os dados temporários serão deletados.'
    )

    if (!confirmed) return

    try {
      setIsCancelling(true)

      if (!accessToken) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`/api/v1/admin/upload/${uploadId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || 'Falha ao cancelar upload')
      }

      const result = await response.json()

      // Toast informativo
      toast({
        title: "Upload cancelado",
        description: result.message || "Os dados temporários foram removidos.",
        variant: "default",
      })

      // Redirecionar para página de upload
      navigate('/admin/upload')
    } catch (err) {
      console.error('Erro ao cancelar upload:', err)
      toast({
        title: "Erro ao cancelar upload",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-600">Carregando preview...</p>
        </div>
      </div>
    )
  }

  if (error || !previewData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || 'Dados de preview não encontrados'}
          </p>
          <button
            onClick={() => navigate('/admin/upload')}
            className="mt-4 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/upload')}
            className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            Preview: {previewData.uploadLog.filename}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Revise os dados antes de confirmar o upload
          </p>
        </div>

        {/* Estatísticas */}
        <div className="mb-8">
          <UploadStatistics
            recordsCount={previewData.statistics.featuresCount}
            statistics={{
              min: previewData.statistics.valueRanges[0]?.min || 0,
              max: previewData.statistics.valueRanges[0]?.max || 0,
              mean: previewData.statistics.valueRanges[0]
                ? (previewData.statistics.valueRanges[0].min + previewData.statistics.valueRanges[0].max) / 2
                : 0,
            }}
            fileSizeBytes={previewData.uploadLog.fileSizeBytes}
            fileType={previewData.uploadLog.mimeType.includes('geopackage') ? 'gpkg' : 'csv'}
          />
        </div>

        {/* Mapa */}
        <div className="mb-8">
          <PreviewMapWithData geojsonData={previewData.previewGeojson} />
        </div>

        {/* Tabela de Dados */}
        <div className="mb-8">
          <DataPreview
            data={transformSampleFeatures(previewData.sampleFeatures)}
            fileType={previewData.uploadLog.mimeType.includes('geopackage') ? 'gpkg' : 'csv'}
          />
        </div>

        {/* Botões de Ação */}
        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Confirme para substituir dados em produção ou cancele para descartar
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isCancelling || isCommitting}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </>
                )}
              </button>

              <button
                onClick={handleConfirm}
                disabled={isCommitting || isCancelling}
                className="inline-flex items-center rounded-md bg-green-600 px-8 py-3 text-base font-semibold text-white shadow-md hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Confirmar Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
