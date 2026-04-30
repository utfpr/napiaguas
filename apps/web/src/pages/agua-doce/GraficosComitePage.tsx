import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { IndicatorSelector } from '@/components/features/agua-doce/IndicatorSelector'
import { ComiteBarChart } from '@/components/features/agua-doce/ComiteBarChart'
import { useComiteAggregations } from '@/hooks/useComiteAggregations'

export function GraficosComitePage() {
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null)
  const { data, isLoading, error } = useComiteAggregations(selectedIndicatorId)

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4 sm:mb-6">
          <BreadcrumbList className="text-sm sm:text-base">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/agua-doce">Água Doce</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Gráficos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Título */}
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
          Gráficos por Comitê de Bacia
        </h1>

        {/* Seletor de Indicador */}
        <div className="mb-4 sm:mb-6">
          <IndicatorSelector
            value={selectedIndicatorId}
            onChange={setSelectedIndicatorId}
          />
        </div>

        {/* Gráfico */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 sm:p-4 shadow-sm">
          {isLoading ? (
            <Skeleton className="h-[300px] sm:h-[400px] w-full" />
          ) : error ? (
            <div className="text-red-500 text-sm sm:text-base" role="alert">
              Erro ao carregar dados: {error.message}
            </div>
          ) : !selectedIndicatorId ? (
            <div className="text-gray-500 text-center py-8 sm:py-12 text-sm sm:text-base">
              Selecione um indicador para visualizar o gráfico
            </div>
          ) : !data?.data.length ? (
            <div className="text-gray-500 text-center py-8 sm:py-12 text-sm sm:text-base">
              Nenhum dado disponível para este indicador
            </div>
          ) : (
            <ComiteBarChart
              data={data.data}
              metadata={data.metadata}
            />
          )}
        </div>
      </div>
    </div>
  )
}
