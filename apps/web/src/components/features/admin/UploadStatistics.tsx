import { FileText, TrendingUp, TrendingDown, Activity, HardDrive, CheckCircle2, XCircle } from 'lucide-react'

interface Statistics {
  min: number
  max: number
  mean: number
  valid_geometries?: number
  invalid_geometries?: number
}

interface UploadStatisticsProps {
  recordsCount: number
  statistics: Statistics
  fileSizeBytes: number
  fileType: 'gpkg' | 'csv'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  iconColor = 'text-blue-500'
}: {
  icon: any
  title: string
  value: string | number
  subtitle?: string
  iconColor?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-full bg-gray-50 p-3 ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export function UploadStatistics({
  recordsCount,
  statistics,
  fileSizeBytes,
  fileType
}: UploadStatisticsProps) {
  const { min, max, mean, valid_geometries, invalid_geometries } = statistics

  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Estatísticas do Upload
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total de Registros */}
        <StatCard
          icon={FileText}
          title="Total de Registros"
          value={recordsCount.toLocaleString('pt-BR')}
          iconColor="text-blue-500"
        />

        {/* Valor Mínimo */}
        <StatCard
          icon={TrendingDown}
          title="Valor Mínimo"
          value={min.toFixed(2)}
          subtitle="Menor valor do indicador"
          iconColor="text-green-500"
        />

        {/* Valor Máximo */}
        <StatCard
          icon={TrendingUp}
          title="Valor Máximo"
          value={max.toFixed(2)}
          subtitle="Maior valor do indicador"
          iconColor="text-red-500"
        />

        {/* Valor Médio */}
        <StatCard
          icon={Activity}
          title="Valor Médio"
          value={mean.toFixed(2)}
          subtitle="Média dos valores"
          iconColor="text-yellow-500"
        />

        {/* Tamanho do Arquivo */}
        <StatCard
          icon={HardDrive}
          title="Tamanho do Arquivo"
          value={formatFileSize(fileSizeBytes)}
          iconColor="text-purple-500"
        />

        {/* Geometrias Válidas/Inválidas (apenas para GPKG) */}
        {fileType === 'gpkg' && valid_geometries !== undefined && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-1">
            <p className="text-sm font-medium text-gray-600">
              Qualidade das Geometrias
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Válidas</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {valid_geometries.toLocaleString('pt-BR')}
                </span>
              </div>
              {invalid_geometries !== undefined && invalid_geometries > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-700">Inválidas</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {invalid_geometries.toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
            {invalid_geometries !== undefined && invalid_geometries > 0 && (
              <div className="mt-4 rounded-md bg-yellow-50 p-3">
                <p className="text-xs text-yellow-800">
                  Geometrias inválidas serão exibidas em cinza no mapa.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Range de Valores */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-700">
          Distribuição de Valores
        </h4>
        <div className="relative">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500"
              style={{ width: '100%' }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span className="font-medium">{min.toFixed(2)}</span>
            <span className="font-medium">{mean.toFixed(2)}</span>
            <span className="font-medium">{max.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>Mínimo</span>
            <span>Média</span>
            <span>Máximo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
