import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'

import { parse } from 'csv-parse/sync'
import type { MultipartFile } from '@fastify/multipart'

import {
  GpkgErrorType,
  type GpkgValidationError,
  type WorkgroupId,
} from '@napi-aguas/shared'

import {
  MissingColumnError,
  InvalidGeometryError,
  InvalidDataTypeError,
} from '@/types/upload-errors'
import { uploadLogRepository, type UploadLogRepository } from '@/repositories/upload-log.repository'
import {
  GpkgParserService,
} from './gpkg-parser.service'
import { gpkgImportService, GpkgImportService } from './gpkg-import.service'
import { comiteAggregationService } from './comite-aggregation.service'
import type { UploadImportStats } from '@/types/upload-stats'
import { logger } from '@/config/logger'

// Diretórios de exportação
const GPKG_EXPORT_DIR = path.join(process.cwd(), '../../data/gpkg')
const CSV_EXPORT_DIR = path.join(process.cwd(), '../../data/dados')

/**
 * Executa comando ogr2ogr de forma segura usando spawn
 * Previne command injection ao usar argumentos separados
 */
function execOgr2ogr(outputPath: string, inputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ogr2ogr', ['-f', 'GeoJSON', outputPath, inputPath])

    let stderr = ''

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ogr2ogr failed with code ${code}: ${stderr}`))
      } else {
        resolve()
      }
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ogr2ogr: ${err.message}`))
    })
  })
}

export interface UploadPreview {
  recordsCount: number
  geometriesValid: number
  geometriesInvalid: number
  sampleFeatures: any[] // Primeiras 50 features
  errors?: Array<{ line: number; message: string }>
}

export class UploadService {
  constructor(
    private readonly gpkgParser: GpkgParserService = new GpkgParserService(),
    private readonly uploadLogsRepo: UploadLogRepository = uploadLogRepository,
    private readonly gpkgImporter: GpkgImportService = gpkgImportService,
  ) {}

  /**
   * Processa upload de arquivo CSV (copia diretamente para exportação)
   */
  async processCSVUpload(
    uploadId: string,
    file: MultipartFile,
    workgroupId: WorkgroupId,
    userId: string
  ): Promise<void> {
    try {
      // Garante que o diretório de exportação existe
      await fs.mkdir(CSV_EXPORT_DIR, { recursive: true })

      // Gera nome do arquivo baseado no workgroup
      const workgroupNames: Record<WorkgroupId, string> = {
        'agua-doce': 'ecossistemas',
        'litoral': 'litoral',
        'saude': 'saude',
        'transportes': 'infraestrutura',
      }

      const workgroupName = workgroupNames[workgroupId] || workgroupId
      const filename = `${workgroupName}.csv`
      const destPath = path.join(CSV_EXPORT_DIR, filename)

      // Remove TODOS os arquivos CSV deste workgroup
      await this.removeOldWorkgroupFiles(CSV_EXPORT_DIR, workgroupName, '.csv')

      // Salva arquivo diretamente no diretório de exportação
      await pipeline(file.file, createWriteStream(destPath))

      console.log(`Arquivo CSV copiado para exportação: ${filename}`)

      // Registra log de upload
      await this.uploadLogsRepo.createLog({
        id: uploadId,
        userId,
        workgroupId,
        filename: file.filename ?? filename,
        fileSizeBytes: (await fs.stat(destPath)).size,
        mimeType: file.mimetype ?? 'text/csv',
      })

      await this.uploadLogsRepo.update(uploadId, {
        status: 'completed',
        completedAt: new Date(),
      })
    } catch (error) {
      console.error(`Erro ao processar upload de CSV (upload ${uploadId}):`, error)
      throw error
    }
  }

  async processUploadAsync(uploadId: string, filePath: string, workgroupId: WorkgroupId): Promise<void> {
    setImmediate(async () => {
      try {
        await this.uploadLogsRepo.updateStatus(uploadId, 'validating')

        const parsedData = await this.gpkgParser.parseGpkg(filePath, workgroupId)
        const schema = this.gpkgParser.validateSchema(parsedData, workgroupId)
        const values = this.gpkgParser.validateValues(parsedData.features, workgroupId)
        const crs = this.gpkgParser.validateCrs(parsedData, workgroupId)
        const geometries = this.gpkgParser.validateGeometries(parsedData.features, workgroupId)
        const featureCount = this.gpkgParser.validateFeatureCount(parsedData, workgroupId)

        // Validações específicas por workgroup
        let codigoIBGE: { valid: boolean; errors: GpkgValidationError[] } = { valid: true, errors: [] }
        if (workgroupId === 'saude' || workgroupId === 'litoral') {
          codigoIBGE = this.gpkgParser.validateCodigoIBGE(parsedData.features, workgroupId)
        }

        const invalidGeometryErrors = geometries.errors.filter(
          (error) => error.type === GpkgErrorType.INVALID_GEOMETRY,
        )

        const blockingErrors = [
          ...schema.errors,
          ...values.errors,
          ...crs.errors,
          ...featureCount.errors,
          ...codigoIBGE.errors,
          ...geometries.errors.filter(
            (error) => error.type !== GpkgErrorType.INVALID_GEOMETRY,
          ),
        ]

        if (blockingErrors.length > 0) {
          await this.uploadLogsRepo.update(uploadId, {
            status: 'failed',
            errors: blockingErrors,
            completedAt: new Date(),
          })
          return
        }

        await this.uploadLogsRepo.updateStatus(uploadId, 'processing')

        // Importar para banco de dados
        const importStats = await this.gpkgImporter.importToDatabase(uploadId, parsedData)
        const invalidFromValidation = invalidGeometryErrors
          .map((error) => (error.featureId ? String(error.featureId) : null))
          .filter((value): value is string => Boolean(value))

        const combinedInvalid = new Set([
          ...importStats.invalidGeometryFeatures,
          ...invalidFromValidation,
        ])

        importStats.invalidGeometryFeatures = Array.from(combinedInvalid)
        importStats.invalidGeometriesCount = combinedInvalid.size

        // Copia arquivo GPKG para diretório de exportação
        await this.copyToExportDirectory(uploadId, filePath, workgroupId)

        // Gera arquivo CSV para exportação
        await this.exportToCSV(uploadId, parsedData, workgroupId)

        // Mudar status para 'completed'
        await this.uploadLogsRepo.update(uploadId, {
          status: 'completed',
          featuresCount: parsedData.features.length,
          indicatorsLoaded: importStats.indicatorsInserted + importStats.indicatorsUpdated,
          stats: importStats,
          completedAt: new Date(),
        })

        // Para água-doce, calcular agregações por comitê automaticamente
        if (workgroupId === 'agua-doce') {
          logger.info({ uploadId }, 'Iniciando cálculo automático de agregações por comitê...')
          try {
            const aggregationCount = await comiteAggregationService.calculateAndPersist()
            logger.info({ uploadId, aggregationCount }, 'Agregações por comitê calculadas com sucesso')
          } catch (aggError) {
            // Não falhar o upload se agregações falharem - apenas logar warning
            logger.warn({ uploadId, error: aggError }, 'Falha ao calcular agregações por comitê (upload concluído)')
          }
        }
      } catch (error) {
        await this.persistFailure(uploadId, error)
      }
      // Não deletar arquivo ainda - será deletado após commit ou cancel
    })
  }

  /**
   * Processa arquivo GPKG
   */
  async processGPKG(
    buffer: Buffer,
    _workgroupId: string,
    _indicatorId: string
  ): Promise<UploadPreview> {
    const tempGpkgPath = path.join('/tmp', `${randomUUID()}.gpkg`)
    const tempGeoJsonPath = path.join('/tmp', `${randomUUID()}.geojson`)

    try {
      // Salvar buffer temporariamente
      await fs.writeFile(tempGpkgPath, buffer)

      // Executar ogr2ogr para converter GPKG para GeoJSON
      // Usando spawn para prevenir command injection
      try {
        await execOgr2ogr(tempGeoJsonPath, tempGpkgPath)
      } catch (error) {
        throw new Error(`Failed to convert GPKG to GeoJSON: ${error}`)
      }

      // Ler e parsear GeoJSON resultante
      const geoJsonContent = await fs.readFile(tempGeoJsonPath, 'utf-8')
      const geoJson = JSON.parse(geoJsonContent)

      // Validar schema
      this.validateGPKGSchema(geoJson, _workgroupId)

      // Contar geometrias válidas e inválidas
      const { valid, invalid, errors } = this.validateGeometries(geoJson.features)

      // Retornar preview
      return {
        recordsCount: geoJson.features.length,
        geometriesValid: valid,
        geometriesInvalid: invalid,
        sampleFeatures: geoJson.features.slice(0, 50),
        errors,
      }
    } finally {
      // Cleanup de arquivos temporários
      try {
        await fs.unlink(tempGpkgPath)
      } catch {}
      try {
        await fs.unlink(tempGeoJsonPath)
      } catch {}
    }
  }

  /**
   * Processa arquivo CSV
   */
  async processCSV(
    buffer: Buffer,
    _workgroupId: string,
    _indicatorId: string
  ): Promise<UploadPreview> {
    try {
      // Parsear CSV
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        cast: false, // Não fazer auto-cast, vamos validar manualmente
        cast_date: false,
      })

      if (records.length === 0) {
        throw new Error('CSV file is empty')
      }

      // Validar schema
      this.validateCSVSchema(records[0])

      // Validar dados
      const errors: Array<{ line: number; message: string }> = []
      records.forEach((record: any, idx: number) => {
        try {
          this.validateCSVRecord(record, idx + 2) // +2 porque linha 1 é header e arrays começam em 0
        } catch (error: any) {
          errors.push({
            line: idx + 2,
            message: error.message,
          })
        }
      })

      // Retornar preview
      return {
        recordsCount: records.length,
        geometriesValid: records.length - errors.length,
        geometriesInvalid: errors.length,
        sampleFeatures: records.slice(0, 50),
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error: any) {
      if (error instanceof MissingColumnError || error instanceof InvalidDataTypeError) {
        throw error
      }
      throw new Error(`Failed to parse CSV: ${error.message}`)
    }
  }

  /**
   * Valida schema de GPKG (GeoJSON)
   */
  private validateGPKGSchema(geoJson: any, workgroupId: string): void {
    if (!geoJson.features || !Array.isArray(geoJson.features)) {
      throw new Error('Invalid GeoJSON: missing features array')
    }

    if (geoJson.features.length === 0) {
      throw new Error('GeoJSON file is empty')
    }

    const firstFeature = geoJson.features[0]
    const properties = firstFeature.properties || {}

    // Colunas obrigatórias
    const requiredColumns = ['id', 'name', 'indicator_value']
    const actualColumns = Object.keys(properties)
    const missingColumns = requiredColumns.filter((col) => !actualColumns.includes(col))

    if (missingColumns.length > 0) {
      throw new MissingColumnError(missingColumns)
    }

    // Verificar tipo de geometria baseado no workgroup
    const expectedGeometryType = this.getExpectedGeometryType(workgroupId)
    if (
      expectedGeometryType &&
      firstFeature.geometry?.type !== expectedGeometryType
    ) {
      throw new InvalidGeometryError(
        1,
        `Expected geometry type ${expectedGeometryType}, got ${firstFeature.geometry?.type}`
      )
    }
  }

  /**
   * Valida schema de CSV
   */
  private validateCSVSchema(firstRecord: any): void {
    const requiredColumns = ['id', 'name', 'indicator_value', 'lat', 'lng']
    const actualColumns = Object.keys(firstRecord)
    const missingColumns = requiredColumns.filter((col) => !actualColumns.includes(col))

    if (missingColumns.length > 0) {
      throw new MissingColumnError(missingColumns)
    }
  }

  /**
   * Valida um registro de CSV
   */
  private validateCSVRecord(record: any, lineNumber: number): void {
    // Validar lat
    if (isNaN(parseFloat(record.lat))) {
      throw new InvalidDataTypeError(lineNumber, 'lat', record.lat, 'number')
    }

    // Validar lng
    if (isNaN(parseFloat(record.lng))) {
      throw new InvalidDataTypeError(lineNumber, 'lng', record.lng, 'number')
    }

    // Validar indicator_value
    if (isNaN(parseFloat(record.indicator_value))) {
      throw new InvalidDataTypeError(
        lineNumber,
        'indicator_value',
        record.indicator_value,
        'number'
      )
    }
  }

  /**
   * Valida geometrias de GeoJSON
   */
  private validateGeometries(features: any[]): {
    valid: number
    invalid: number
    errors: Array<{ line: number; message: string }>
  } {
    let valid = 0
    let invalid = 0
    const errors: Array<{ line: number; message: string }> = []

    features.forEach((feature, idx) => {
      if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
        invalid++
        errors.push({
          line: idx + 1,
          message: 'Missing or invalid geometry',
        })
      } else {
        valid++
      }
    })

    return { valid, invalid, errors }
  }

  private async persistSuccess(uploadId: string, stats: UploadImportStats): Promise<void> {
    await this.uploadLogsRepo.update(uploadId, {
      status: 'completed',
      featuresCount: stats.featuresProcessed,
      indicatorsLoaded: stats.indicatorsLoaded,
      stats,
      completedAt: new Date(),
    })
  }

  private async persistFailure(uploadId: string, error: unknown): Promise<void> {
    const validationError: GpkgValidationError = {
      type: GpkgErrorType.INTERNAL_ERROR,
      message:
        error instanceof Error
          ? error.message
          : 'Erro inesperado durante processamento do upload',
      details:
        error instanceof Error && error.stack
          ? { stack: error.stack }
          : undefined,
    }

    await this.uploadLogsRepo.update(uploadId, {
      status: 'failed',
      errors: [validationError],
      completedAt: new Date(),
    })
  }

  /**
   * Retorna o tipo de geometria esperado baseado no workgroup
   */
  private getExpectedGeometryType(workgroupId: string): string | null {
    const geometryTypes: Record<string, string> = {
      'agua-doce': 'Polygon',
      litoral: 'Polygon',
      saude: 'Polygon',
      transportes: 'LineString',
    }

    return geometryTypes[workgroupId] || null
  }

  /**
   * Copia arquivo GPKG para diretório de exportação
   * Remove TODOS os arquivos GPKG deste workgroup antes de copiar
   * Nome do arquivo: <workgroup>.gpkg (sem timestamp para manter apenas a versão mais recente)
   */
  private async copyToExportDirectory(
    uploadId: string,
    sourcePath: string,
    workgroupId: WorkgroupId
  ): Promise<void> {
    try {
      // Garante que o diretório de exportação existe
      await fs.mkdir(GPKG_EXPORT_DIR, { recursive: true })

      // Gera nome do arquivo baseado no workgroup
      const workgroupNames: Record<WorkgroupId, string> = {
        'agua-doce': 'ecossistemas',
        'litoral': 'litoral',
        'saude': 'saude',
        'transportes': 'infraestrutura',
      }

      const workgroupName = workgroupNames[workgroupId] || workgroupId
      const filename = `${workgroupName}.gpkg`
      const destPath = path.join(GPKG_EXPORT_DIR, filename)

      // Remove TODOS os arquivos GPKG deste workgroup
      await this.removeOldWorkgroupFiles(GPKG_EXPORT_DIR, workgroupName, '.gpkg')

      // Copia novo arquivo
      await fs.copyFile(sourcePath, destPath)

      console.log(`Arquivo GPKG copiado para exportação: ${filename}`)
    } catch (error) {
      console.error(`Erro ao copiar arquivo GPKG para exportação (upload ${uploadId}):`, error)
      // Não lança erro para não bloquear o upload
    }
  }

  /**
   * Exporta dados do GeoJSON para arquivo CSV
   * Remove TODOS os arquivos CSV deste workgroup antes de criar
   * Nome do arquivo: <workgroup>.csv (sem timestamp para manter apenas a versão mais recente)
   */
  private async exportToCSV(
    uploadId: string,
    geojson: any,
    workgroupId: WorkgroupId
  ): Promise<void> {
    try {
      // Garante que o diretório de exportação existe
      await fs.mkdir(CSV_EXPORT_DIR, { recursive: true })

      // Gera nome do arquivo baseado no workgroup
      const workgroupNames: Record<WorkgroupId, string> = {
        'agua-doce': 'ecossistemas',
        'litoral': 'litoral',
        'saude': 'saude',
        'transportes': 'infraestrutura',
      }

      const workgroupName = workgroupNames[workgroupId] || workgroupId
      const filename = `${workgroupName}.csv`
      const destPath = path.join(CSV_EXPORT_DIR, filename)

      // Remove TODOS os arquivos CSV deste workgroup
      await this.removeOldWorkgroupFiles(CSV_EXPORT_DIR, workgroupName, '.csv')

      // Converte features para CSV
      const csvLines: string[] = ['id,name,indicator_value,lat,lng']

      for (const feature of geojson.features) {
        const props = feature.properties || {}
        const geometry = feature.geometry

        // Calcula centroid para lat/lng
        let lat = 0
        let lng = 0

        if (geometry?.type === 'Polygon' && geometry.coordinates?.[0]?.length > 0) {
          // Calcula centroid do primeiro anel do polígono
          const coords = geometry.coordinates[0]
          lng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length
          lat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length
        } else if (geometry?.type === 'LineString' && geometry.coordinates?.length > 0) {
          // Calcula ponto médio da linha
          const coords = geometry.coordinates
          const midIndex = Math.floor(coords.length / 2)
          lng = coords[midIndex][0]
          lat = coords[midIndex][1]
        } else if (geometry?.type === 'Point' && geometry.coordinates?.length >= 2) {
          lng = geometry.coordinates[0]
          lat = geometry.coordinates[1]
        }

        // Escapa campos para CSV
        const id = this.escapeCSVField(String(props.id || ''))
        const name = this.escapeCSVField(String(props.name || ''))
        const indicatorValue = this.escapeCSVField(String(props.indicator_value || ''))

        csvLines.push(`${id},${name},${indicatorValue},${lat},${lng}`)
      }

      // Escreve arquivo CSV
      const csvContent = csvLines.join('\n') + '\n'
      await fs.writeFile(destPath, csvContent, 'utf-8')

      console.log(`Arquivo CSV gerado para exportação: ${filename}`)
    } catch (error) {
      console.error(`Erro ao gerar CSV para exportação (upload ${uploadId}):`, error)
      // Não lança erro para não bloquear o upload
    }
  }

  /**
   * Remove todos os arquivos antigos de um workgroup (por nome e extensão)
   * Isso garante que apenas a versão mais recente seja mantida
   */
  private async removeOldWorkgroupFiles(
    directory: string,
    workgroupName: string,
    extension: string
  ): Promise<void> {
    try {
      const files = await fs.readdir(directory)

      // Filtra arquivos que pertencem a este workgroup
      const workgroupFiles = files.filter(file => {
        const lowerFile = file.toLowerCase()
        const lowerWorkgroup = workgroupName.toLowerCase()
        return lowerFile.includes(lowerWorkgroup) && lowerFile.endsWith(extension)
      })

      // Remove todos os arquivos encontrados
      for (const file of workgroupFiles) {
        try {
          const filePath = path.join(directory, file)
          await fs.unlink(filePath)
          console.log(`Arquivo antigo removido: ${file}`)
        } catch (error: any) {
          console.warn(`Erro ao remover arquivo ${file}:`, error.message)
        }
      }
    } catch (error: any) {
      console.warn(`Erro ao listar arquivos do diretório ${directory}:`, error.message)
    }
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
}

export const uploadService = new UploadService()
