import env from '@/config/env'

const API_BASE_URL = env.apiUrl

interface PreviewData {
  id: string
  filename: string
  workgroup_id: string
  indicator_id: string
  records_count: number
  statistics: {
    min: number
    max: number
    mean: number
    valid_geometries?: number
    invalid_geometries?: number
  }
  sample_data: Array<{
    id: string
    name: string
    indicator_value: number
    geometry_type?: string
    lat?: number
    lng?: number
  }>
  file_size_bytes: number
  file_type: 'gpkg' | 'csv'
}

interface CommitResponse {
  message: string
  records_inserted: number
}

class StagingService {
  /**
   * Busca dados de preview de um upload em staging
   */
  async getPreview(uploadId: string): Promise<PreviewData> {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/staging/${uploadId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || 'Falha ao buscar preview')
    }

    return response.json()
  }

  /**
   * Busca GeoJSON de um upload em staging para renderização no mapa
   */
  async getGeoJSON(uploadId: string): Promise<GeoJSON.FeatureCollection> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/staging/${uploadId}/geojson`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || 'Falha ao buscar GeoJSON')
    }

    return response.json()
  }

  /**
   * Confirma o upload e move dados de staging para produção
   */
  async commitUpload(uploadId: string): Promise<CommitResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/staging/${uploadId}/commit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || 'Falha ao confirmar upload')
    }

    return response.json()
  }

  /**
   * Cancela o upload e remove dados de staging
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/staging/${uploadId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || 'Falha ao cancelar upload')
    }
  }
}

export const stagingService = new StagingService()
