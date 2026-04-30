import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import type { MultipartFile } from '@fastify/multipart'
import type { FastifyPluginAsync } from 'fastify'
import { GpkgErrorType, type WorkgroupId } from '@napi-aguas/shared'

import { authenticate } from '@/middleware/auth'
import { uploadLogRepository } from '@/repositories/upload-log.repository'
import { uploadService } from '@/services/upload.service'
import {
  TMP_UPLOAD_DIR,
  ensureUploadTempDir,
  sanitizeFilename,
  validateGpkgFile,
} from '@/utils/file-validation'
// Imports relacionados a tabelas temp removidos (funcionalidade de preview descontinuada)

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

// Workgroups válidos
const VALID_WORKGROUPS: readonly WorkgroupId[] = ['agua-doce', 'saude', 'litoral', 'transportes'] as const

function buildValidationError(message: string) {
  return {
    error: {
      code: 'INVALID_UPLOAD',
      message,
    },
  }
}

/**
 * Verifica se o usuário tem permissão para fazer upload no workgroup especificado
 * - admin: pode fazer upload em qualquer workgroup
 * - gt_member: só pode fazer upload no workgroup vinculado à sua conta
 */
function hasWorkgroupPermission(
  userRole: string | undefined,
  userWorkgroupId: string | null | undefined,
  targetWorkgroupId: WorkgroupId
): boolean {
  // Admin tem acesso a todos os workgroups
  if (userRole === 'admin') {
    return true
  }

  // gt_member só pode acessar seu próprio workgroup
  if (userRole === 'gt_member' && userWorkgroupId === targetWorkgroupId) {
    return true
  }

  return false
}

function buildForbiddenError(userWorkgroupId: string | null | undefined, targetWorkgroupId: string) {
  const userGt = userWorkgroupId ? `GT "${userWorkgroupId}"` : 'nenhum GT'
  return {
    error: {
      code: 'FORBIDDEN',
      message: `Acesso negado. Você está vinculado ao ${userGt} e não tem permissão para fazer upload no GT "${targetWorkgroupId}".`,
    },
  }
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // Rota para upload de arquivos CSV (copia diretamente para exportação)
  fastify.post(
    '/admin/upload/:workgroup/csv',
    {
      onRequest: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
          keyGenerator: (request) => request.user?.userId ?? request.ip,
          errorResponseBuilder: (_request, context) => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Max ${context.max} uploads per hour`,
            retryAfter: Math.ceil(context.ttl / 1000),
          }),
        },
      },
    },
    async (request, reply) => {
      // Validar workgroup
      const { workgroup } = request.params as { workgroup: string }

      if (!VALID_WORKGROUPS.includes(workgroup as WorkgroupId)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_WORKGROUP',
            message: `Workgroup inválido: "${workgroup}". Valores aceitos: ${VALID_WORKGROUPS.join(', ')}`,
          },
        })
      }

      const workgroupId = workgroup as WorkgroupId

      // Verificar permissão do usuário para este workgroup
      const userRole = request.user?.role as string | undefined
      const userWorkgroupId = request.user?.workgroupId as string | null | undefined

      if (!hasWorkgroupPermission(userRole, userWorkgroupId, workgroupId)) {
        request.log.warn(
          { userRole, userWorkgroupId, targetWorkgroup: workgroupId },
          'Tentativa de upload em workgroup não autorizado'
        )
        return reply.status(403).send(buildForbiddenError(userWorkgroupId, workgroupId))
      }

      const data: MultipartFile | undefined = await request.file()

      if (!data) {
        return reply.status(400).send(buildValidationError('Arquivo CSV obrigatório'))
      }

      const userId = request.user?.userId
      if (!userId) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token inválido ou expirado',
          },
        })
      }

      const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'text/plain',
      ]

      if (!data.mimetype || !allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send(buildValidationError('Formato inválido. Envie um arquivo .csv'))
      }

      const uploadId = randomUUID()

      try {
        // Processa upload de CSV (copia diretamente para exportação)
        await uploadService.processCSVUpload(uploadId, data, workgroupId, userId)

        return reply.status(200).send({
          upload_id: uploadId,
          status: 'completed',
          message: 'Arquivo CSV enviado com sucesso',
        })
      } catch (error) {
        request.log.error({ error }, 'Falha ao processar upload de CSV')

        return reply.status(500).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Erro interno ao processar upload',
          },
        })
      }
    }
  )

  fastify.post(
    '/admin/upload/:workgroup/gpkg',
    {
      onRequest: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
          keyGenerator: (request) => request.user?.userId ?? request.ip,
          errorResponseBuilder: (_request, context) => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Max ${context.max} uploads per hour`,
            retryAfter: Math.ceil(context.ttl / 1000),
          }),
        },
      },
    },
    async (request, reply) => {
      // Validar workgroup
      const { workgroup } = request.params as { workgroup: string }

      if (!VALID_WORKGROUPS.includes(workgroup as WorkgroupId)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_WORKGROUP',
            message: `Workgroup inválido: "${workgroup}". Valores aceitos: ${VALID_WORKGROUPS.join(', ')}`,
          },
        })
      }

      const workgroupId = workgroup as WorkgroupId

      // Verificar permissão do usuário para este workgroup
      const userRole = request.user?.role as string | undefined
      const userWorkgroupId = request.user?.workgroupId as string | null | undefined

      if (!hasWorkgroupPermission(userRole, userWorkgroupId, workgroupId)) {
        request.log.warn(
          { userRole, userWorkgroupId, targetWorkgroup: workgroupId },
          'Tentativa de upload em workgroup não autorizado'
        )
        return reply.status(403).send(buildForbiddenError(userWorkgroupId, workgroupId))
      }

      const data: MultipartFile | undefined = await request.file()

      if (!data) {
        return reply.status(400).send(buildValidationError('Arquivo GPKG obrigatório'))
      }

      const userId = request.user?.userId
      if (!userId) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token inválido ou expirado',
          },
        })
      }

      const allowedMimeTypes = [
        'application/geopackage+sqlite3',
        'application/gpkg',
        'application/octet-stream',
        'application/vnd.sqlite3',
      ]

      if (!data.mimetype || !allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send(buildValidationError('Formato inválido. Envie um arquivo .gpkg'))
      }

      const sanitizedFilename = sanitizeFilename(data.filename ?? 'upload.gpkg')
      const uploadId = randomUUID()

      await ensureUploadTempDir()

      const tempFilePath = path.join(TMP_UPLOAD_DIR, `${uploadId}-${Date.now()}.gpkg`)

      try {
        const fileStream = data.file
        await pipeline(fileStream, createWriteStream(tempFilePath))

        if ((fileStream as any)?.truncated) {
          await unlink(tempFilePath).catch(() => undefined)
          return reply.status(413).send({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Arquivo muito grande. Tamanho máximo permitido é 50MB',
            },
          })
        }

        const stats = await stat(tempFilePath)

        if (stats.size > MAX_UPLOAD_BYTES) {
          await unlink(tempFilePath).catch(() => undefined)
          return reply.status(413).send({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Arquivo muito grande. Tamanho máximo permitido é 50MB',
            },
          })
        }

        const log = await uploadLogRepository.createLog({
          id: uploadId,
          userId,
          workgroupId,
          filename: sanitizedFilename,
          fileSizeBytes: stats.size,
          mimeType: data.mimetype,
        })

        const isValidMagicBytes = await validateGpkgFile(tempFilePath)

        if (!isValidMagicBytes) {
          await uploadLogRepository.update(log.id, {
            status: 'failed',
            errors: [
              {
                type: GpkgErrorType.INVALID_VALUE_TYPE,
                message: 'Arquivo enviado não possui assinatura de um GPKG válido',
              },
            ],
            completedAt: new Date(),
          })
          await unlink(tempFilePath).catch(() => undefined)
          return reply.status(400).send(buildValidationError('Arquivo inválido. Esperado GPKG compatível com SQLite'))
        }

        uploadService.processUploadAsync(uploadId, tempFilePath, workgroupId)

        return reply.status(200).send({
          upload_id: uploadId,
          status: 'processing',
        })
      } catch (error) {
        request.log.error({ error }, 'Falha ao processar upload de GPKG')
        await uploadLogRepository.update(uploadId, {
          status: 'failed',
          errors: [
            {
              type: GpkgErrorType.INTERNAL_ERROR,
              message:
                error instanceof Error
                  ? error.message
                  : 'Erro inesperado durante upload de GPKG',
            },
          ],
          completedAt: new Date(),
        })
        await unlink(tempFilePath).catch(() => undefined)

        return reply.status(500).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Erro interno ao processar upload',
          },
        })
      }
    }
  )

  fastify.get(
    '/admin/upload/:uploadId/status',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const { uploadId } = request.params as { uploadId: string }
      const log = await uploadLogRepository.getLog(uploadId)

      if (!log) {
        return reply.status(404).send({
          error: {
            code: 'UPLOAD_NOT_FOUND',
            message: 'Upload não encontrado',
          },
        })
      }

      const response: Record<string, unknown> = {
        status: log.status,
      }

      if (log.status === 'failed') {
        response.errors = log.errors ?? []
      }

      if (log.status === 'completed') {
        response.statistics = {
          featuresCount: log.featuresCount ?? 0,
          indicatorsLoaded: log.indicatorsLoaded ?? 0,
          geometriesInserted: log.stats?.geometriesInserted ?? 0,
          geometriesUpdated: log.stats?.geometriesUpdated ?? 0,
          indicatorsInserted: log.stats?.indicatorsInserted ?? 0,
          indicatorsUpdated: log.stats?.indicatorsUpdated ?? 0,
          processingTimeMs: log.stats?.processingTimeMs ?? 0,
        }
      }

      return reply.status(200).send(response)
    }
  )

  /**
   * NOTA: Os endpoints /preview, /commit e /cancel foram removidos
   * A funcionalidade de preview temporário foi descontinuada.
   * Os dados agora são importados diretamente para as tabelas de produção após validação.
   */
}
