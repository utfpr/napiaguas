import env from '@/config/env'

export interface ExportFile {
  filename: string
  workgroup: string
  format: 'csv' | 'gpkg'
  size: number
  lastModified: string
}

export interface ExportFilesResponse {
  files: ExportFile[]
}

/**
 * Busca lista de arquivos CSV disponíveis para download
 */
export async function fetchAvailableFiles(): Promise<ExportFile[]> {
  const url = `${env.apiBaseUrl}/export/files`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Erro ao buscar arquivos: ${response.status}`)
  }

  const data: ExportFilesResponse = await response.json()
  return data.files
}

/**
 * Faz download de um arquivo CSV específico
 */
export async function downloadFile(filename: string): Promise<void> {
  const url = `${env.apiBaseUrl}/export/files/${encodeURIComponent(filename)}`

  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Erro ao baixar arquivo: ${response.status}`)
  }

  const blob = await response.blob()

  // Trigger browser download
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Cleanup
  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl)
    if (document.body.contains(a)) {
      document.body.removeChild(a)
    }
  }, 100)
}

/**
 * Formata tamanho de arquivo em formato legível
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
