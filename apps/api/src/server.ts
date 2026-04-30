import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { logger } from '@/config/logger'
import { closePool, db } from '@/db/connection'
import { healthRoutes } from '@/routes/health.routes'
import { workgroupsRoutes } from '@/routes/workgroups.routes'
import { aguaDoceRoutes } from '@/routes/agua-doce.routes'
import { saudeRoutes } from '@/routes/saude.routes'
import { errorHandler } from '@/middleware/error-handler'
import { geometriesTransportesRoutes } from '@/routes/geometries-transportes.routes'
import { indicatorsRoutes } from '@/routes/indicators.routes'
import { exportRoutes } from '@/routes/export.routes'
import { authRoutes } from '@/routes/auth.routes'
import { uploadRoutes } from '@/routes/admin/upload.routes'
import { stagingRoutes } from '@/routes/admin/staging.routes'
import { authService } from '@/services/auth.service'
import { stagingCleanupService } from '@/services/staging-cleanup.service'
import { uploadTempCleanupService } from '@/services/upload-temp-cleanup.service'
import { comiteAggregationService } from '@/services/comite-aggregation.service'
import { comiteAggregationsRoutes } from '@/routes/comite-aggregations.routes'

export const buildServer = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET é obrigatório em produção. Defina uma string aleatória segura (mínimo de 32 caracteres).'
    )
  }

  const server = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
  })

  server.decorate('db', db)
  server.decorate('comiteAggregationService', comiteAggregationService)

  server.addHook('onClose', async () => {
    await closePool()
    uploadTempCleanupService.stop()
  })

  server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })

  server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  server.register(compress, {
    global: true,
    threshold: 1024, // 1KB
    encodings: ['gzip', 'br'], // gzip e brotli
  })

  server.register(jwt, {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  })

  server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
    },
  })

  server.addHook('onReady', async () => {
    authService.setFastifyInstance(server)
    stagingCleanupService.startCronJob(server)
    uploadTempCleanupService.start()
  })

  server.register(healthRoutes)
  server.register(authRoutes, { prefix: '/api/v1' })
  server.register(workgroupsRoutes, { prefix: '/api/v1' })
  server.register(aguaDoceRoutes, { prefix: '/api/v1' })
  server.register(comiteAggregationsRoutes, { prefix: '/api/v1' })
  server.register(saudeRoutes, { prefix: '/api/v1' })
  server.register(geometriesTransportesRoutes, { prefix: '/api/v1' })
  server.register(indicatorsRoutes, { prefix: '/api/v1' })
  server.register(exportRoutes)
  server.register(uploadRoutes, { prefix: '/api/v1' })
  server.register(stagingRoutes, { prefix: '/api/v1/admin' })

  server.setErrorHandler(errorHandler)

  return server
}

export const start = async () => {
  try {
    const server = buildServer()
    await server.listen({
      port: parseInt(process.env.API_PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
    })
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  start()
}
