import type { GpkgValidationError, WorkgroupId } from '@napi-aguas/shared'

import env from '@/config/env'

const API_BASE_URL = env.apiUrl

export type UploadStatus = 'processing' | 'validating' | 'failed' | 'completed'

export interface UploadResponse {
  upload_id: string
  status: UploadStatus
}

export interface UploadStatusResponse {
  status: UploadStatus
  errors?: GpkgValidationError[]
  statistics?: {
    featuresCount: number
    indicatorsLoaded: number
  }
}

export async function fetchUploadStatus(
  uploadId: string,
  accessToken: string
): Promise<UploadStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/upload/${uploadId}/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 404) {
    throw new Error('Upload não encontrado ou expirado.')
  }

  if (response.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!response.ok) {
    throw new Error(`Falha ao consultar status do upload (HTTP ${response.status}).`)
  }

  return response.json() as Promise<UploadStatusResponse>
}

export function uploadGpkgFile(
  file: File,
  workgroup: WorkgroupId,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return uploadFile(file, workgroup, 'gpkg', accessToken, onProgress)
}

export function uploadCsvFile(
  file: File,
  workgroup: WorkgroupId,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return uploadFile(file, workgroup, 'csv', accessToken, onProgress)
}

function uploadFile(
  file: File,
  workgroup: WorkgroupId,
  fileType: 'gpkg' | 'csv',
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (typeof onProgress === 'function' && event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onerror = () => {
      reject(new Error('Erro de rede durante o upload. Verifique sua conexão e tente novamente.'))
    }

    xhr.ontimeout = () => {
      reject(new Error('Tempo limite excedido durante o upload.'))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as UploadResponse
          resolve(parsed)
        } catch (error) {
          reject(new Error('Resposta inesperada do servidor de upload.'))
        }
        return
      }

      try {
        const errorResponse = JSON.parse(xhr.responseText)
        const retryAfter = errorResponse.retryAfter as number | undefined

        if (xhr.status === 400) {
          reject(new Error(errorResponse.error?.message ?? 'Arquivo inválido.'))
          return
        }

        if (xhr.status === 401) {
          reject(new Error('Sessão expirada. Faça login novamente.'))
          return
        }

        if (xhr.status === 413) {
          reject(new Error('Arquivo muito grande. Tamanho máximo permitido é 50MB.'))
          return
        }

        if (xhr.status === 429) {
          const waitSeconds = retryAfter ?? 3600
          reject(
            new Error(
              `Limite de uploads excedido. Tente novamente em aproximadamente ${Math.ceil(waitSeconds / 60)} minutos.`
            )
          )
          return
        }

        reject(new Error(errorResponse.error?.message ?? 'Falha ao enviar arquivo.'))
      } catch (error) {
        reject(new Error(`Falha ao enviar arquivo (HTTP ${xhr.status}).`))
      }
    }

    xhr.open('POST', `${API_BASE_URL}/api/v1/admin/upload/${workgroup}/${fileType}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.timeout = 2 * 60 * 1000 // 2 minutos
    xhr.send(formData)
  })
}
