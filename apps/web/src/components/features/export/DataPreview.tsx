import type { ExportPreview } from '@napi-aguas/shared'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface DataPreviewProps {
  data: ExportPreview | null
  isLoading: boolean
  error: Error | null
  className?: string
}

export function DataPreview({ data, isLoading, error, className }: DataPreviewProps) {
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Preview dos Dados</h3>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">
              <strong>Erro ao carregar preview:</strong> {error.message}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Verifique os filtros selecionados e tente novamente.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Preview dos Dados</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Preview dos Dados</h3>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-center">
            <p className="text-sm text-blue-800">
              Clique em <strong>Pré-visualizar</strong> para ver as primeiras 10 linhas dos dados.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Preview dos Dados</h3>
          <p className="text-sm text-gray-600">
            Exibindo primeiras <strong>{data.preview_count}</strong> de{' '}
            <strong>{data.total_records.toLocaleString('pt-BR')}</strong> linhas
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Valor</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Latitude</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Longitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((row, index: number) => (
                <tr
                  key={row.id || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {row.id.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {row.indicator_value}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {row.lat.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {row.lng.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.total_records === 0 && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 mt-4">
            <p className="text-sm text-yellow-800">
              Nenhum registro encontrado com os filtros selecionados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
