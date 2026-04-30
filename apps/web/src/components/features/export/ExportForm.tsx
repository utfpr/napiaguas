import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { useIndicatorsByWorkgroup } from '@/hooks/useIndicatorsByWorkgroup'
import { geometriesService, type Municipality, type Subbacia } from '@/services/geometries.service'

const WORKGROUPS = [
  { id: 'agua-doce', name: 'Água Doce' },
  { id: 'litoral', name: 'Litoral' },
  { id: 'saude', name: 'Saúde' },
  { id: 'transportes', name: 'Transportes' },
] as const

type WorkgroupId = typeof WORKGROUPS[number]['id']
type ExportFormat = 'csv' | 'gpkg'

export interface ExportFormData {
  workgroup: WorkgroupId | ''
  indicatorId: string
  format: ExportFormat
  municipalityIds?: string[]
  subbaciaIds?: string[]
  roadType?: 'federal' | 'estadual'
}

export interface ExportFormProps {
  onSubmit: (data: ExportFormData) => void
  isLoading?: boolean
  className?: string
}

export function ExportForm({ onSubmit, isLoading = false, className }: ExportFormProps) {
  const [formData, setFormData] = useState<ExportFormData>({
    workgroup: '',
    indicatorId: '',
    format: 'csv',
  })

  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [subbacias, setSubbacias] = useState<Subbacia[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)

  // Busca indicadores baseado no workgroup selecionado
  const { indicators, isLoading: isLoadingIndicators } = useIndicatorsByWorkgroup(formData.workgroup)

  // Reset indicatorId quando workgroup muda
  useEffect(() => {
    setFormData((prev) => ({ ...prev, indicatorId: '' }))
  }, [formData.workgroup])

  // Carrega filtros dinâmicos baseado no workgroup
  useEffect(() => {
    const loadFilters = async () => {
      if (!formData.workgroup) {
        setMunicipalities([])
        setSubbacias([])
        return
      }

      setIsLoadingFilters(true)

      try {
        if (formData.workgroup === 'saude' || formData.workgroup === 'litoral') {
          const muns = await geometriesService.fetchMunicipalities(formData.workgroup)
          setMunicipalities(muns)
        } else if (formData.workgroup === 'agua-doce') {
          const subs = await geometriesService.fetchSubbacias()
          setSubbacias(subs)
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error)
      } finally {
        setIsLoadingFilters(false)
      }
    }

    loadFilters()
  }, [formData.workgroup])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.workgroup && formData.indicatorId) {
      onSubmit(formData)
    }
  }

  const isFormValid = formData.workgroup && formData.indicatorId

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-900">
          Configurar Exportação
        </h2>
        <p className="text-sm text-gray-600">
          Selecione o grupo de trabalho, indicador e formato de exportação
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Workgroup Selection */}
          <div className="space-y-2">
            <Label htmlFor="workgroup">
              Grupo de Trabalho <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.workgroup}
              onValueChange={(value) =>
                setFormData({ ...formData, workgroup: value as WorkgroupId })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo de trabalho" />
              </SelectTrigger>
              <SelectContent>
                {WORKGROUPS.map((wg) => (
                  <SelectItem key={wg.id} value={wg.id}>
                    {wg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicator Selection */}
          <div className="space-y-2">
            <Label htmlFor="indicator">
              Indicador <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.indicatorId}
              onValueChange={(value) =>
                setFormData({ ...formData, indicatorId: value })
              }
              disabled={!formData.workgroup || isLoading || isLoadingIndicators}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.workgroup
                      ? 'Primeiro selecione um grupo de trabalho'
                      : isLoadingIndicators
                      ? 'Carregando indicadores...'
                      : indicators.length === 0
                      ? 'Nenhum indicador disponível'
                      : 'Selecione um indicador'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {indicators.length > 0 && (
                  <SelectItem value="__ALL__" className="font-semibold">
                    Todos os indicadores
                  </SelectItem>
                )}
                {indicators.map((indicator) => (
                  <SelectItem key={indicator.id} value={indicator.id}>
                    {indicator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.workgroup && indicators.length > 0 && (
              <p className="text-xs text-gray-500">
                {formData.indicatorId === '__ALL__'
                  ? `Exportará todos os ${indicators.length} indicadores em um único arquivo`
                  : `${indicators.length} indicador${indicators.length !== 1 ? 'es' : ''} disponível${indicators.length !== 1 ? 'eis' : ''}`}
              </p>
            )}
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <Label>
              Formato de Exportação <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.format}
              onValueChange={(value) =>
                setFormData({ ...formData, format: value as ExportFormat })
              }
              name="format"
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="font-normal cursor-pointer">
                  CSV (Tabela)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gpkg" id="format-gpkg" />
                <Label htmlFor="format-gpkg" className="font-normal cursor-pointer">
                  GPKG (GeoPackage)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-gray-500">
              {formData.format === 'csv'
                ? 'Formato CSV para análise em planilhas (Excel, Google Sheets)'
                : 'Formato GPKG para uso em sistemas GIS (QGIS, ArcGIS)'}
            </p>
          </div>

          {/* Conditional Filters based on Workgroup */}
          {formData.workgroup && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Filtros Opcionais</h3>

              {/* Municipality filter for Saúde and Litoral */}
              {(formData.workgroup === 'saude' || formData.workgroup === 'litoral') && (
                <div className="space-y-2">
                  <Label htmlFor="municipality">Município (opcional)</Label>
                  <Select
                    disabled={isLoading || isLoadingFilters}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        municipalityIds: value ? [value] : undefined,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingFilters
                            ? 'Carregando municípios...'
                            : municipalities.length === 0
                            ? 'Nenhum município disponível'
                            : 'Todos os municípios'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalities.map((mun) => (
                        <SelectItem key={mun.id} value={mun.id}>
                          {mun.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {municipalities.length > 0
                      ? `${municipalities.length} município${municipalities.length !== 1 ? 's' : ''} disponível${municipalities.length !== 1 ? 'eis' : ''}`
                      : 'Deixe em branco para exportar dados de todos os municípios'}
                  </p>
                </div>
              )}

              {/* Subbacia filter for Água Doce */}
              {formData.workgroup === 'agua-doce' && (
                <div className="space-y-2">
                  <Label htmlFor="subbacia">Subbacia (opcional)</Label>
                  <Select
                    disabled={isLoading || isLoadingFilters}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        subbaciaIds: value ? [value] : undefined,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingFilters
                            ? 'Carregando subbacias...'
                            : subbacias.length === 0
                            ? 'Nenhuma subbacia disponível'
                            : 'Todas as subbacias'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subbacias.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {subbacias.length > 0
                      ? `${subbacias.length} subbacia${subbacias.length !== 1 ? 's' : ''} disponível${subbacias.length !== 1 ? 'eis' : ''}`
                      : 'Deixe em branco para exportar dados de todas as subbacias'}
                  </p>
                </div>
              )}

              {/* Road type filter for Transportes */}
              {formData.workgroup === 'transportes' && (
                <div className="space-y-2">
                  <Label htmlFor="road-type">Tipo de Rodovia (opcional)</Label>
                  <Select
                    disabled={isLoading}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        roadType: value as 'federal' | 'estadual' | undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as rodovias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Rodovias Federais</SelectItem>
                      <SelectItem value="estadual">Rodovias Estaduais</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Deixe em branco para exportar dados de todas as rodovias
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full bg-primary-dark hover:bg-primary-dark/90"
            >
              {isLoading ? 'Gerando exportação...' : 'Exportar Dados'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
