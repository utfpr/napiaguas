import { Download, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProjectDocument {
  filename: string
  title: string
  description: string
}

const DOCUMENTS_BASE_PATH = '/documentos/'

const PROJECT_DOCUMENTS: ProjectDocument[] = [
  {
    filename: 'indicadores-agua-doce.pdf',
    title: 'Indicadores – GT Ecossistemas de Água Doce',
    description: 'Explicação dos indicadores do índice do GT Ecossistemas de Água Doce',
  },
  {
    filename: 'indicadores-litoral.pdf',
    title: 'Indicadores – GT Litoral',
    description: 'Explicação dos indicadores do índice do GT Litoral',
  },
  {
    filename: 'indicadores-saude.pdf',
    title: 'Indicadores – GT Saúde',
    description: 'Explicação dos indicadores do índice do GT Saúde',
  },
  {
    filename: 'indicadores-transportes.pdf',
    title: 'Indicadores – GT Infraestrutura de Transportes',
    description: 'Explicação dos indicadores do índice do GT Infraestrutura de Transportes',
  },
]

interface DocumentsListProps {
  className?: string
}

export function DocumentsList({ className }: DocumentsListProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="border-b border-primary/20 bg-primary/10 text-primary-dark">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Documentos do Projeto</span>
          <span className="text-sm font-normal text-gray-600">
            {PROJECT_DOCUMENTS.length} arquivo{PROJECT_DOCUMENTS.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Documentação de referência do Projeto NAPI Águas
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {PROJECT_DOCUMENTS.map((doc) => (
            <div
              key={doc.filename}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-red-100 text-red-800">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 sm:truncate" title={doc.title}>
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      PDF
                    </span>
                    <span className="text-xs text-gray-500">{doc.description}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" className="self-start flex-shrink-0 sm:ml-4 sm:self-auto" asChild>
                <a
                  href={`${DOCUMENTS_BASE_PATH}${doc.filename}`}
                  download={doc.filename}
                  aria-label={`Baixar ${doc.title} (PDF)`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
