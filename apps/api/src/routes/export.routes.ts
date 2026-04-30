import type { FastifyPluginAsync } from 'fastify'
import { createReadStream } from 'fs'
import { readdir, stat, mkdir } from 'fs/promises'
import { join } from 'path'
import {
  ExportRequestSchema,
  ExportTooLargeErrorSchema,
  IndicatorNotFoundErrorSchema
} from '@napi-aguas/shared'

import { exportService, ExportTimeoutError } from '../services/export.service'
import { ExportTooLargeError } from '../repositories/export.repository'
import { indicatorsRepository, transportesIndicatorsRepository } from '../repositories/indicators.repository'

// Caminhos para os arquivos estáticos
const CSV_DIR = join(process.cwd(), '../../data/dados')
const GPKG_DIR = join(process.cwd(), '../../data/gpkg')

// Garante que os diretórios de exportação existam
async function ensureExportDirectories(): Promise<void> {
  await mkdir(CSV_DIR, { recursive: true })
  await mkdir(GPKG_DIR, { recursive: true })
}

/**
 * Extrai workgroup do nome do arquivo
 */
function extractWorkgroup(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('ecossistemas') || lower.includes('ecossistema')) {
    return 'agua-doce'
  } else if (lower.includes('litoral')) {
    return 'litoral'
  } else if (lower.includes('saude')) {
    return 'saude'
  } else if (lower.includes('infraestrutura')) {
    return 'transportes'
  }
  return 'geral'
}

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  // Garante que os diretórios existam ao inicializar as rotas
  await ensureExportDirectories()

  /**
   * GET /api/v1/export/files
   * Lista todos os arquivos CSV e GPKG disponíveis para download
   */
  fastify.get('/api/v1/export/files', async (request, reply) => {
    try {
      const fileList: Array<{
        filename: string
        workgroup: string
        format: 'csv' | 'gpkg'
        size: number
        lastModified: string
      }> = []

      // Lista arquivos CSV
      try {
        const csvFiles = await readdir(CSV_DIR)
        const csvFilesList = await Promise.all(
          csvFiles
            .filter(f => f.endsWith('.csv'))
            .map(async (filename) => {
              const filepath = join(CSV_DIR, filename)
              const stats = await stat(filepath)

              return {
                filename,
                workgroup: extractWorkgroup(filename),
                format: 'csv' as const,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
              }
            })
        )
        fileList.push(...csvFilesList)
      } catch (error) {
        request.log.warn({ err: error }, 'Failed to read CSV directory')
      }

      // Lista arquivos GPKG
      try {
        const gpkgFiles = await readdir(GPKG_DIR)
        const gpkgFilesList = await Promise.all(
          gpkgFiles
            .filter(f => f.endsWith('.gpkg'))
            .map(async (filename) => {
              const filepath = join(GPKG_DIR, filename)
              const stats = await stat(filepath)

              return {
                filename,
                workgroup: extractWorkgroup(filename),
                format: 'gpkg' as const,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
              }
            })
        )
        fileList.push(...gpkgFilesList)
      } catch (error) {
        request.log.warn({ err: error }, 'Failed to read GPKG directory')
      }

      // Ordena por workgroup e depois por nome
      fileList.sort((a, b) => {
        if (a.workgroup !== b.workgroup) {
          return a.workgroup.localeCompare(b.workgroup)
        }
        return a.filename.localeCompare(b.filename)
      })

      return reply.send({ files: fileList })
    } catch (error) {
      request.log.error({ err: error }, 'Failed to list export files')
      return reply.status(500).send({
        error: {
          message: 'Erro ao listar arquivos disponíveis',
        },
      })
    }
  })

  /**
   * GET /api/v1/export/files/:filename
   * Baixa um arquivo CSV ou GPKG específico
   */
  fastify.get('/api/v1/export/files/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string }

      // Validação de segurança: apenas arquivos CSV/GPKG e sem path traversal
      const isCSV = filename.endsWith('.csv')
      const isGPKG = filename.endsWith('.gpkg')

      if ((!isCSV && !isGPKG) || filename.includes('..') || filename.includes('/')) {
        return reply.status(400).send({
          error: {
            message: 'Nome de arquivo inválido',
          },
        })
      }

      // Determina diretório baseado na extensão
      const dir = isCSV ? CSV_DIR : GPKG_DIR
      const filepath = join(dir, filename)

      // Verifica se arquivo existe
      try {
        await stat(filepath)
      } catch {
        return reply.status(404).send({
          error: {
            message: 'Arquivo não encontrado',
          },
        })
      }

      // Configura headers de resposta baseado no formato
      const contentType = isCSV ? 'text/csv; charset=utf-8' : 'application/geopackage+sqlite3'
      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      // Retorna arquivo como stream
      const fileStream = createReadStream(filepath)
      return reply.send(fileStream)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to download file')
      return reply.status(500).send({
        error: {
          message: 'Erro ao baixar arquivo',
        },
      })
    }
  })

  /**
   * GET /api/v1/export/csv
   * Exporta dados de indicador em formato CSV
   */
  fastify.get('/api/v1/export/csv', async (request, reply) => {
    const startTime = Date.now()

    try {
      // Validação de query params
      const params = ExportRequestSchema.parse(request.query)

      // Gera CSV
      const result = await exportService.generateCSV({
        workgroup: params.workgroup,
        indicatorId: params.indicator_id,
        filters: {
          municipality_ids: params.municipality_ids,
          subbacia_ids: params.subbacia_ids,
        },
      })

      // Configura headers de resposta
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`)

      // Registra métricas
      const durationMs = Date.now() - startTime
      request.log.info(
        {
          duration_ms: durationMs,
          records_count: result.recordsCount,
          workgroup: params.workgroup,
          indicator_id: params.indicator_id,
        },
        'CSV export completed'
      )

      // Registra log de exportação após sucesso
      await exportService.logExport({
        workgroupId: params.workgroup,
        indicatorId: params.indicator_id,
        format: 'csv',
        userIp: request.ip,
        recordsCount: result.recordsCount,
        fileSizeBytes: result.fileSizeBytes,
      })

      // Retorna stream CSV
      return reply.send(result.stream)
    } catch (error) {
      // Erro: exportação muito grande (413)
      if (error instanceof ExportTooLargeError) {
        const errorResponse = ExportTooLargeErrorSchema.parse({
          error: {
            code: 'EXPORT_TOO_LARGE',
            message: 'Exportação excede limite de 10.000 registros. Aplique filtros adicionais.',
            records_found: error.recordsFound,
            max_records: error.maxRecords,
          },
        })

        return reply.status(413).send(errorResponse)
      }

      // Erro: validação de query params (400)
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: {
            message: 'Validation error',
            details: error,
          },
        })
      }

      // Erro: indicador não encontrado (404)
      if (error instanceof Error && error.message.includes('not found')) {
        const errorResponse = IndicatorNotFoundErrorSchema.parse({
          error: {
            code: 'INDICATOR_NOT_FOUND',
            message: 'Indicador não encontrado',
          },
        })

        return reply.status(404).send(errorResponse)
      }

      // Erro genérico (500)
      request.log.error({ err: error }, 'CSV export failed')
      return reply.status(500).send({
        error: {
          message: 'Internal server error',
        },
      })
    }
  })

  /**
   * GET /api/v1/export/gpkg
   * Exporta dados de indicador em formato GPKG (GeoPackage)
   */
  fastify.get('/api/v1/export/gpkg', async (request, reply) => {
    const startTime = Date.now()
    let tempFiles: string[] = []

    try {
      // Validação de query params
      const params = ExportRequestSchema.parse(request.query)

      // Busca nome do indicador do banco de dados
      const repository = params.workgroup === 'transportes'
        ? transportesIndicatorsRepository
        : indicatorsRepository

      const indicator = await repository.findById(params.indicator_id)

      if (!indicator) {
        const errorResponse = IndicatorNotFoundErrorSchema.parse({
          error: {
            code: 'INDICATOR_NOT_FOUND',
            message: 'Indicador não encontrado',
          },
        })
        return reply.status(404).send(errorResponse)
      }

      const indicatorName = indicator.name

      // Gera GPKG
      const result = await exportService.exportGPKG({
        workgroup: params.workgroup,
        indicatorId: params.indicator_id,
        indicatorName,
        filters: {
          municipality_ids: params.municipality_ids,
          subbacia_ids: params.subbacia_ids,
        },
        timeout: 60000, // 60 seconds
      })

      tempFiles = result.tempFiles

      // Configura headers de resposta
      reply.header('Content-Type', 'application/geopackage+sqlite3')
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`)

      // Registra métricas
      const durationMs = Date.now() - startTime
      request.log.info(
        {
          duration_ms: durationMs,
          records_count: result.recordsCount,
          file_size_bytes: result.fileSizeBytes,
          workgroup: params.workgroup,
          indicator_id: params.indicator_id,
        },
        'GPKG export completed'
      )

      // Registra log de exportação após sucesso
      await exportService.logExport({
        workgroupId: params.workgroup,
        indicatorId: params.indicator_id,
        format: 'gpkg',
        userIp: request.ip,
        recordsCount: result.recordsCount,
        fileSizeBytes: result.fileSizeBytes,
      })

      // Hook para cleanup de arquivos temporários após envio
      reply.raw.on('finish', async () => {
        await exportService.cleanupTempFiles(tempFiles)
      })

      // Retorna arquivo GPKG como stream
      const fileStream = createReadStream(result.filepath)
      return reply.send(fileStream)
    } catch (error) {
      // Cleanup de arquivos temporários em caso de erro
      await exportService.cleanupTempFiles(tempFiles)

      // Erro: timeout (504)
      if (error instanceof ExportTimeoutError) {
        return reply.status(504).send({
          error: {
            code: 'EXPORT_TIMEOUT',
            message: 'Exportação excedeu tempo limite de 60 segundos',
          },
        })
      }

      // Erro: exportação muito grande (413)
      if (error instanceof ExportTooLargeError) {
        const errorResponse = ExportTooLargeErrorSchema.parse({
          error: {
            code: 'EXPORT_TOO_LARGE',
            message: 'Exportação excede limite de 10.000 registros. Aplique filtros adicionais.',
            records_found: error.recordsFound,
            max_records: error.maxRecords,
          },
        })

        return reply.status(413).send(errorResponse)
      }

      // Erro: validação de query params (400)
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: {
            message: 'Validation error',
            details: error,
          },
        })
      }

      // Erro: indicador não encontrado (404)
      if (error instanceof Error && error.message.includes('not found')) {
        const errorResponse = IndicatorNotFoundErrorSchema.parse({
          error: {
            code: 'INDICATOR_NOT_FOUND',
            message: 'Indicador não encontrado',
          },
        })

        return reply.status(404).send(errorResponse)
      }

      // Erro genérico (500)
      request.log.error({ err: error }, 'GPKG export failed')
      return reply.status(500).send({
        error: {
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  })

  /**
   * GET /api/v1/export/preview
   * Retorna preview com primeiras 10 linhas de dados
   */
  fastify.get('/api/v1/export/preview', async (request, reply) => {
    try {
      // Validação de query params (usa mesmo schema do CSV)
      const params = ExportRequestSchema.parse(request.query)

      // Busca preview
      const preview = await exportService.getPreview({
        workgroup: params.workgroup,
        indicatorId: params.indicator_id,
        filters: {
          municipality_ids: params.municipality_ids,
          subbacia_ids: params.subbacia_ids,
        },
      })

      // Configura headers de resposta
      reply.header('Content-Type', 'application/json; charset=utf-8')

      // Retorna JSON
      return preview
    } catch (error) {
      // Erro: validação de query params (400)
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: {
            message: 'Validation error',
            details: error,
          },
        })
      }

      // Erro: indicador não encontrado (404)
      if (error instanceof Error && error.message.includes('not found')) {
        const errorResponse = IndicatorNotFoundErrorSchema.parse({
          error: {
            code: 'INDICATOR_NOT_FOUND',
            message: 'Indicador não encontrado',
          },
        })

        return reply.status(404).send(errorResponse)
      }

      // Erro genérico (500)
      request.log.error({ err: error }, 'Export preview failed')
      return reply.status(500).send({
        error: {
          message: 'Internal server error',
        },
      })
    }
  })
}
