import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DataRecord {
  id: string
  name: string
  indicator_value: number
  geometry_type?: string
  lat?: number
  lng?: number
  [key: string]: any
}

interface DataPreviewProps {
  data: DataRecord[]
  fileType: 'gpkg' | 'csv'
}

const ROWS_PER_PAGE = 10

export function DataPreview({ data, fileType }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const currentData = data.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const getColumns = () => {
    if (fileType === 'gpkg') {
      return ['ID', 'Nome', 'Valor do Indicador', 'Tipo de Geometria']
    }
    return ['ID', 'Nome', 'Valor do Indicador', 'Latitude', 'Longitude']
  }

  const renderCellValue = (record: DataRecord, column: string) => {
    switch (column) {
      case 'ID':
        return record.id
      case 'Nome':
        return record.name
      case 'Valor do Indicador':
        return Number(record.indicator_value).toFixed(2)
      case 'Tipo de Geometria':
        return record.geometry_type || '-'
      case 'Latitude':
        return record.lat ? Number(record.lat).toFixed(6) : '-'
      case 'Longitude':
        return record.lng ? Number(record.lng).toFixed(6) : '-'
      default:
        return '-'
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Preview dos Dados ({data.length} registros)
        </h3>
        <p className="text-sm text-gray-600">
          Exibindo primeiras {Math.min(50, data.length)} linhas
        </p>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {getColumns().map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {currentData.map((record, index) => (
              <tr
                key={record.id || index}
                className="hover:bg-gray-50 transition-colors"
              >
                {getColumns().map((column) => (
                  <td
                    key={column}
                    className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                  >
                    {renderCellValue(record, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
