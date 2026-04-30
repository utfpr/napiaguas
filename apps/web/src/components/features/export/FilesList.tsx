import { useState, useEffect } from 'react'
import { Download, FileText, Database, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  fetchAvailableFiles,
  downloadFile,
  formatFileSize,
  type ExportFile,
} from '@/services/export-files.service'
import { cn } from '@/lib/utils'

const WORKGROUP_NAMES: Record<string, string> = {
  'agua-doce': 'Água Doce',
  'litoral': 'Litoral',
  'saude': 'Saúde',
  'transportes': 'Infraestrutura de Transportes',
  'geral': 'Geral',
}

const WORKGROUP_DESCRIPTIONS: Record<string, string> = {
  'agua-doce': 'Dados de vulnerabilidade aquática e ecossistemas de água doce',
  'litoral': 'Dados de vulnerabilidade costeira dos municípios litorâneos',
  'saude': 'Dados de exposição à saúde dos municípios do Paraná',
  'transportes': 'Dados de vulnerabilidade da infraestrutura rodoviária',
  'geral': 'Dados gerais do sistema',
}

const WORKGROUP_COLORS: Record<string, string> = {
  'agua-doce': 'bg-blue-100 text-blue-800 border-blue-200',
  'litoral': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'saude': 'bg-green-100 text-green-800 border-green-200',
  'transportes': 'bg-orange-100 text-orange-800 border-orange-200',
  'geral': 'bg-gray-100 text-gray-800 border-gray-200',
}

const FORMAT_LABELS: Record<'csv' | 'gpkg', { label: string; description: string; color: string }> = {
  csv: {
    label: 'CSV',
    description: 'Tabela para Excel/Planilhas',
    color: 'bg-emerald-100 text-emerald-800',
  },
  gpkg: {
    label: 'GPKG',
    description: 'GeoPackage para GIS',
    color: 'bg-purple-100 text-purple-800',
  },
}

interface FilesListProps {
  className?: string
}

export function FilesList({ className }: FilesListProps) {
  const [files, setFiles] = useState<ExportFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  // Carrega lista de arquivos
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const filesList = await fetchAvailableFiles()
        setFiles(filesList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar arquivos')
      } finally {
        setIsLoading(false)
      }
    }

    loadFiles()
  }, [])

  const handleDownload = async (filename: string) => {
    try {
      setDownloadingFile(filename)
      await downloadFile(filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar arquivo')
    } finally {
      setDownloadingFile(null)
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Carregando arquivos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('w-full border-red-200 bg-red-50', className)}>
        <CardContent className="py-6">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (files.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-gray-600">Nenhum arquivo disponível para download</p>
          <p className="text-xs text-gray-500 mt-2">
            Faça upload de arquivos pelo painel administrativo para disponibilizá-los aqui
          </p>
        </CardContent>
      </Card>
    )
  }

  // Agrupa arquivos por workgroup
  const filesByWorkgroup = files.reduce((acc, file) => {
    if (!acc[file.workgroup]) {
      acc[file.workgroup] = []
    }
    acc[file.workgroup].push(file)
    return acc
  }, {} as Record<string, ExportFile[]>)

  // Ordena workgroups
  const sortedWorkgroups = Object.keys(filesByWorkgroup).sort((a, b) => {
    const order = ['agua-doce', 'litoral', 'saude', 'transportes', 'geral']
    return order.indexOf(a) - order.indexOf(b)
  })

  return (
    <div className={cn('space-y-6', className)}>
      {sortedWorkgroups.map((workgroup) => {
        const workgroupFiles = filesByWorkgroup[workgroup]
        const workgroupColor = WORKGROUP_COLORS[workgroup] || WORKGROUP_COLORS.geral

        return (
          <Card key={workgroup} className="w-full">
            <CardHeader className={cn('border-b', workgroupColor)}>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>{WORKGROUP_NAMES[workgroup] || workgroup}</span>
                <span className="text-sm font-normal text-gray-600">
                  {workgroupFiles.length} arquivo{workgroupFiles.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {WORKGROUP_DESCRIPTIONS[workgroup] || 'Dados do grupo de trabalho'}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {workgroupFiles.map((file) => {
                  const formatInfo = FORMAT_LABELS[file.format]
                  const FileIcon = file.format === 'csv' ? FileText : Database

                  return (
                    <div
                      key={file.filename}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn('p-2 rounded-lg', formatInfo.color)}>
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              formatInfo.color
                            )}>
                              {formatInfo.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="text-xs text-gray-400">
                              •
                            </span>
                            <span className="text-xs text-gray-500" title={formatInfo.description}>
                              {formatInfo.description}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(file.filename)}
                        disabled={downloadingFile !== null}
                        size="sm"
                        className="ml-4 flex-shrink-0"
                      >
                        {downloadingFile === file.filename ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Baixando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
