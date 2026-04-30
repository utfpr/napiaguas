import env from '@/config/env'
import type { ExportPreview } from '@napi-aguas/shared'

export interface ExportFilters {
  municipalityIds?: string[]
  subbaciaIds?: string[]
  roadType?: 'federal' | 'estadual'
}

export interface FetchPreviewParams {
  workgroup: string
  indicatorId: string
  filters?: ExportFilters
}

export interface DownloadParams {
  workgroup: string
  indicatorId: string
  filters?: ExportFilters
}

/**
 * Builds query string from export parameters
 */
function buildQueryString(
  workgroup: string,
  indicatorId: string,
  filters?: ExportFilters
): string {
  const params = new URLSearchParams({
    workgroup,
    indicator_id: indicatorId,
  })

  if (filters?.municipalityIds && filters.municipalityIds.length > 0) {
    filters.municipalityIds.forEach((id) => {
      params.append('municipality_ids[]', id)
    })
  }

  if (filters?.subbaciaIds && filters.subbaciaIds.length > 0) {
    filters.subbaciaIds.forEach((id) => {
      params.append('subbacia_ids[]', id)
    })
  }

  if (filters?.roadType) {
    params.append('road_type', filters.roadType)
  }

  return params.toString()
}

/**
 * Fetches preview of export data (first 10 records)
 */
export async function fetchPreview({
  workgroup,
  indicatorId,
  filters,
}: FetchPreviewParams): Promise<ExportPreview> {
  const queryString = buildQueryString(workgroup, indicatorId, filters)
  const url = `${env.apiBaseUrl}/export/preview?${queryString}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Erro ao buscar preview: ${response.status}`)
  }

  const data = await response.json()
  return data as ExportPreview
}

/**
 * Triggers browser download for a blob
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    window.URL.revokeObjectURL(url)
    if (document.body.contains(a)) {
      document.body.removeChild(a)
    }
  }, 100)
}

function extractFilename(contentDisposition: string | null, defaultName: string): string {
  if (!contentDisposition) return defaultName

  const filenameMatch = contentDisposition.match(/filename="(.+)"/)
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1]
  }

  const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
  if (filenameStarMatch && filenameStarMatch[1]) {
    return decodeURIComponent(filenameStarMatch[1])
  }

  return defaultName
}

/**
 * Downloads CSV export file
 */
export async function downloadCSV({
  workgroup,
  indicatorId,
  filters,
}: DownloadParams): Promise<void> {
  const queryString = buildQueryString(workgroup, indicatorId, filters)
  const url = `${env.apiBaseUrl}/export/csv?${queryString}`

  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Erro ao exportar CSV: ${response.status}`)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('Content-Disposition')
  const filename = extractFilename(contentDisposition, 'export.csv')

  triggerBrowserDownload(blob, filename)
}

/**
 * Downloads GPKG export file
 */
export async function downloadGPKG({
  workgroup,
  indicatorId,
  filters,
}: DownloadParams): Promise<void> {
  const queryString = buildQueryString(workgroup, indicatorId, filters)
  const url = `${env.apiBaseUrl}/export/gpkg?${queryString}`

  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Erro ao exportar GPKG: ${response.status}`)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('Content-Disposition')
  const filename = extractFilename(contentDisposition, 'export.gpkg')

  triggerBrowserDownload(blob, filename)
}

/**
 * Estimates file size based on record count and format
 */
export function estimateSize(recordsCount: number, format: 'csv' | 'gpkg'): number {
  const bytesPerRecord = format === 'csv' ? 150 : 300
  return recordsCount * bytesPerRecord
}

/**
 * Formats bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Estimates download time in seconds (assuming 1 MB/s speed)
 */
export function estimateDownloadTime(bytes: number): number {
  const MB_PER_SECOND = 1024 * 1024
  return Math.ceil(bytes / MB_PER_SECOND)
}
