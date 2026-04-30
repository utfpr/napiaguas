import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { authService } from '@/services/auth.service'

const loginRequestSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
})

const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['admin', 'gt_member']),
    workgroupId: z.string().nullable(),
  }),
})

const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
})

const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/auth/login
   * Autenticação de usuário com email e senha
   * Rate limit: 10 tentativas por minuto para prevenir brute force
   */
  fastify.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
    try {
      const { email, password } = loginRequestSchema.parse(request.body)

      const result = await authService.login(email, password)

      const response = loginResponseSchema.parse(result)

      fastify.log.info(
        {
          event: 'auth.login.success',
          userId: result.user.id,
          email: result.user.email,
        },
        'Login realizado com sucesso'
      )

      return reply.status(200).send(response)
    } catch (error: any) {
      fastify.log.error(
        {
          event: 'auth.login.error',
          err: error,
          statusCode: error.statusCode,
          code: error.code,
        },
        'Erro ao realizar login'
      )

      if (error.statusCode === 401) {
        return reply.status(401).send({
          error: {
            code: error.code || 'UNAUTHORIZED',
            message: error.message,
          },
        })
      }

      // Erro de validação Zod
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados de entrada inválidos',
            details: error.errors,
          },
        })
      }

      // Erro genérico
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro interno do servidor',
        },
      })
    }
  })

  /**
   * POST /api/v1/auth/refresh
   * Renovação de access token usando refresh token
   */
  fastify.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshTokenRequestSchema.parse(request.body)

      const result = await authService.refreshAccessToken(refreshToken)

      const response = refreshTokenResponseSchema.parse(result)

      fastify.log.info(
        {
          event: 'auth.refresh.success',
        },
        'Token renovado com sucesso'
      )

      return reply.status(200).send(response)
    } catch (error: any) {
      fastify.log.error(
        {
          event: 'auth.refresh.error',
          err: error,
          statusCode: error.statusCode,
          code: error.code,
        },
        'Erro ao renovar token'
      )

      if (error.statusCode === 401) {
        return reply.status(401).send({
          error: {
            code: error.code || 'UNAUTHORIZED',
            message: error.message,
          },
        })
      }

      // Erro de validação Zod
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados de entrada inválidos',
            details: error.errors,
          },
        })
      }

      // Erro genérico
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro interno do servidor',
        },
      })
    }
  })
}
