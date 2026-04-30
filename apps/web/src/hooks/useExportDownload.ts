import { useState } from 'react'
import {
  downloadCSV,
  downloadGPKG,
  fetchPreview,
  type DownloadParams,
  type FetchPreviewParams,
} from '@/services/export.service'
import type { ExportPreview } from '@napi-aguas/shared'

export type ExportState = 'idle' | 'loading' | 'success' | 'error'

export interface UseExportDownloadReturn {
  state: ExportState
  error: Error | null
  preview: ExportPreview | null
  isLoading: boolean
  loadPreview: (params: FetchPreviewParams) => Promise<void>
  executeDownload: (params: DownloadParams, format: 'csv' | 'gpkg') => Promise<void>
  reset: () => void
}

/**
 * Custom hook for managing export download state
 */
export function useExportDownload(): UseExportDownloadReturn {
  const [state, setState] = useState<ExportState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [preview, setPreview] = useState<ExportPreview | null>(null)

  const reset = () => {
    setState('idle')
    setError(null)
    setPreview(null)
  }

  const loadPreview = async (params: FetchPreviewParams) => {
    setState('loading')
    setError(null)
    setPreview(null)

    try {
      const data = await fetchPreview(params)
      setPreview(data)
      setState('success')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar preview')
      setError(error)
      setState('error')
    }
  }

  const executeDownload = async (params: DownloadParams, format: 'csv' | 'gpkg') => {
    setState('loading')
    setError(null)

    try {
      if (format === 'csv') {
        await downloadCSV(params)
      } else {
        await downloadGPKG(params)
      }
      setState('success')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao baixar arquivo')
      setError(error)
      setState('error')
    }
  }

  return {
    state,
    error,
    preview,
    isLoading: state === 'loading',
    loadPreview,
    executeDownload,
    reset,
  }
}
