import { Readable } from 'stream'
import { randomUUID } from 'crypto'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'

import {
  ExportRepository,
  ExportTooLargeError,
  exportRepository,
  type ExportDataRecord,
  type ExportFilters,
  type ExportPreviewResult,
} from '../repositories/export.repository'
import { ExportLogRepository, exportLogRepository, type NewExportLog } from '../repositories/export-log.repository'
import { convertGeoJSONToGPKG, GDALTimeoutError, GDALError } from '../utils/gdal'

export interface CSVExportOptions {
  workgroup: string
  indicatorId: string
  filters?: ExportFilters
}

export interface CSVExportResult {
  stream: Readable
  filename: string
  recordsCount: number
  fileSizeBytes: number
}

export interface ExportError {
  code: string
  message: string
  records_found?: number
  max_records?: number
}

export interface GPKGExportOptions {
  workgroup: string
  indicatorId: string
  indicatorName: string
  filters?: ExportFilters
  timeout?: number // Default: 60000ms (60s)
}

export interface GPKGExportResult {
  filepath: string
  filename: string
  recordsCount: number
  fileSizeBytes: number
  tempFiles: string[] // Files to cleanup
}

export class ExportTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportTimeoutError'
  }
}

export class ExportService {
  constructor(
    private exportRepository: ExportRepository,
    private exportLogRepository: ExportLogRepository
  ) {}

  /**
   * Gera stream CSV com dados de exportação
   */
  async generateCSV(options: CSVExportOptions): Promise<CSVExportResult> {
    try {
      const data = await this.exportRepository.getExportData(
        options.workgroup,
        options.indicatorId,
        options.filters
      )

      const csvContent = this.convertToCSV(data)
      const stream = Readable.from([csvContent])
      const fileSizeBytes = Buffer.byteLength(csvContent, 'utf-8')

      // Gera filename sanitizado
      const filename = this.generateFilename(options.workgroup, 'indicator')

      return {
        stream,
        filename,
        recordsCount: data.length,
        fileSizeBytes,
      }
    } catch (error) {
      if (error instanceof ExportTooLargeError) {
        throw error
      }
      throw new Error(`Failed to generate CSV: ${(error as Error).message}`)
    }
  }

  /**
   * Retorna preview de dados (primeiras 10 linhas)
   */
  async getPreview(options: CSVExportOptions): Promise<ExportPreviewResult> {
    return this.exportRepository.getPreview(
      options.workgroup,
      options.indicatorId,
      options.filters
    )
  }

  /**
   * Gera arquivo GPKG com dados geoespaciais
   *
   * Workflow:
   * 1. Obtém GeoJSON do repositório
   * 2. Salva GeoJSON temporário em /tmp/<uuid>.geojson
   * 3. Executa ogr2ogr para converter para GPKG
   * 4. Retorna path do GPKG gerado + lista de arquivos temporários para cleanup
   *
   * @throws ExportTooLargeError se dataset excede 10.000 registros
   * @throws ExportTimeoutError se conversão excede timeout configurado
   * @throws GDALError se ogr2ogr falha
   */
  async exportGPKG(options: GPKGExportOptions): Promise<GPKGExportResult> {
    const timeout = options.timeout ?? 60000 // 60 segundos default
    const uuid = randomUUID()
    const tempGeojsonPath = `/tmp/${uuid}.geojson`
    const tempGpkgPath = `/tmp/${uuid}.gpkg`
    const tempFiles: string[] = []

    try {
      // 1. Obtém GeoJSON do repositório
      const geojson = await this.exportRepository.getGeoJSONForExport(
        options.workgroup,
        options.indicatorId,
        options.filters
      )

      const recordsCount = geojson.features.length

      // 2. Salva GeoJSON temporário
      const geojsonContent = JSON.stringify(geojson, null, 2)
      await writeFile(tempGeojsonPath, geojsonContent, 'utf-8')
      tempFiles.push(tempGeojsonPath)

      // 3. Converte GeoJSON para GPKG usando ogr2ogr
      // Layer name sanitizado baseado no indicador
      const layerName = this.sanitizeLayerName(options.indicatorName)

      try {
        await convertGeoJSONToGPKG(tempGeojsonPath, tempGpkgPath, {
          layerName,
          timeout,
        })
      } catch (error) {
        if (error instanceof GDALTimeoutError) {
          throw new ExportTimeoutError(
            `Exportação excedeu tempo limite de ${timeout / 1000} segundos`
          )
        }
        if (error instanceof GDALError) {
          throw new Error(`Falha na conversão GPKG: ${error.message}. Detalhes: ${error.stderr}`)
        }
        throw error
      }

      tempFiles.push(tempGpkgPath)

      // 4. Obtém tamanho do arquivo gerado
      const fs = await import('fs/promises')
      const stats = await fs.stat(tempGpkgPath)
      const fileSizeBytes = stats.size

      // 5. Gera filename sanitizado
      const filename = this.generateFilename(options.workgroup, options.indicatorName).replace('.csv', '.gpkg')

      return {
        filepath: tempGpkgPath,
        filename,
        recordsCount,
        fileSizeBytes,
        tempFiles,
      }
    } catch (error) {
      // Cleanup em caso de erro
      await this.cleanupTempFiles(tempFiles)

      if (error instanceof ExportTooLargeError) {
        throw error
      }
      if (error instanceof ExportTimeoutError) {
        throw error
      }

      throw new Error(`Failed to generate GPKG: ${(error as Error).message}`)
    }
  }

  /**
   * Limpa arquivos temporários criados durante exportação
   */
  async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        if (existsSync(file)) {
          await unlink(file)
        }
      } catch (error) {
        // Ignora erros de cleanup (log se necessário)
        console.warn(`Failed to cleanup temp file ${file}:`, error)
      }
    }
  }

  /**
   * Sanitiza nome do indicador para usar como layer name no GPKG
   * Remove caracteres especiais e acentos, mantém apenas alfanuméricos e underscores
   */
  private sanitizeLayerName(indicatorName: string): string {
    return indicatorName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Substitui por underscore
      .replace(/^_+|_+$/g, '') // Remove underscores do início/fim
      .substring(0, 63) // Limit PostgreSQL identifier length
  }

  /**
   * Registra exportação no log de auditoria
   */
  async logExport(logData: NewExportLog): Promise<void> {
    await this.exportLogRepository.createExportLog(logData)
  }

  /**
   * Converte array de registros em string CSV
   */
  private convertToCSV(data: ExportDataRecord[]): string {
    // Cabeçalho fixo
    const header = 'id,name,indicator_value,lat,lng\n'

    // Linhas de dados
    const rows = data.map((record) => {
      return [
        this.escapeCSVField(record.id),
        this.escapeCSVField(record.name),
        this.escapeCSVField(record.indicator_value),
        record.lat,
        record.lng,
      ].join(',')
    })

    return header + rows.join('\n') + '\n'
  }

  /**
   * Escapa campo CSV (adiciona aspas duplas se necessário)
   */
  private escapeCSVField(field: string): string {
    // Se contém vírgula, aspas ou quebra de linha, envolve em aspas
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      // Duplica aspas internas e envolve em aspas
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  /**
   * Gera filename sanitizado no formato: <workgroup>_<indicator-slug>_<YYYY-MM-DD>.csv
   */
  generateFilename(workgroup: string, indicatorName: string): string {
    // Remove acentos usando NFD (Normalization Form Decomposition)
    const sanitizedIndicator = indicatorName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
      .replace(/^-+|-+$/g, '') // Remove hífens do início/fim

    // Formata data como YYYY-MM-DD
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]

    return `${workgroup}_${sanitizedIndicator}_${dateStr}.csv`
  }

  /**
   * Formata erro de exportação muito grande
   */
  formatTooLargeError(error: ExportTooLargeError): ExportError {
    return {
      code: 'EXPORT_TOO_LARGE',
      message: 'Exportação excede limite de 10.000 registros. Aplique filtros adicionais.',
      records_found: error.recordsFound,
      max_records: error.maxRecords,
    }
  }
}

// Singleton instance exportada com dependências injetadas
export const exportService = new ExportService(
  exportRepository,
  exportLogRepository
)
