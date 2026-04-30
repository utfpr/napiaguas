import { FilesList } from '@/components/features/export/FilesList'

export function ExportPage() {

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Exportar Dados
          </h1>
          <p className="text-gray-600">
            Baixe os arquivos CSV (tabelas) e GPKG (geoespaciais) com os dados dos indicadores de vulnerabilidade climática do Paraná.
          </p>
        </div>

        {/* Lista de arquivos disponíveis */}
        <div className="max-w-4xl mx-auto">
          <FilesList />
        </div>
      </div>
    </div>
  )
}
