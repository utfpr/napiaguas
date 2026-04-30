import * as bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'

import type { LoginResponse } from '@napi-aguas/shared'

import { logger } from '@/config/logger'
import { userRepository } from '@/repositories/user.repository'

export class AuthService {
  private readonly log = logger.child({ service: 'AuthService' })
  private fastify: FastifyInstance | null = null
  private saltRounds: number

  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  }

  /**
   * Registra a instância do Fastify para uso do plugin JWT
   * Deve ser chamado após o plugin @fastify/jwt ser registrado
   */
  setFastifyInstance(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  /**
   * Realiza o login do usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Tokens JWT e dados do usuário
   * @throws Error com statusCode 401 para credenciais inválidas
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await userRepository.findByEmail(email)

    if (!user) {
      this.log.warn({ email }, 'Tentativa de login com email não cadastrado')
      const error = new Error('Email ou senha incorretos')
      ;(error as any).statusCode = 401
      ;(error as any).code = 'INVALID_CREDENTIALS'
      throw error
    }

    if (!user.active) {
      this.log.warn({ userId: user.id, email }, 'Tentativa de login com usuário inativo')
      const error = new Error('Usuário inativo')
      ;(error as any).statusCode = 401
      ;(error as any).code = 'INACTIVE_USER'
      throw error
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      this.log.warn({ userId: user.id, email }, 'Tentativa de login com senha incorreta')
      const error = new Error('Email ou senha incorretos')
      ;(error as any).statusCode = 401
      ;(error as any).code = 'INVALID_CREDENTIALS'
      throw error
    }

    if (!this.fastify) {
      throw new Error('Fastify instance not set in AuthService')
    }

    // Gerar tokens JWT
    const accessToken = this.fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        workgroupId: user.workgroupId,
      },
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h',
      }
    )

    const refreshToken = this.fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        workgroupId: user.workgroupId,
      } as any,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      }
    )

    this.log.info({ userId: user.id, email: user.email }, 'Login realizado com sucesso')

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workgroupId: user.workgroupId,
      },
    }
  }

  /**
   * Renova o access token usando um refresh token válido
   * @param refreshToken - Refresh token JWT
   * @returns Novo access token
   * @throws Error com statusCode 401 para tokens inválidos
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (!this.fastify) {
      throw new Error('Fastify instance not set in AuthService')
    }

    try {
      const decoded = this.fastify.jwt.verify<{ userId: string; type: string }>(refreshToken)

      if (decoded.type !== 'refresh') {
        this.log.warn({ tokenType: decoded.type }, 'Token JWT não é do tipo refresh')
        const error = new Error('Token inválido ou expirado')
        ;(error as any).statusCode = 401
        ;(error as any).code = 'UNAUTHORIZED'
        throw error
      }

      const user = await userRepository.findById(decoded.userId)

      if (!user) {
        this.log.warn({ userId: decoded.userId }, 'Usuário não encontrado ao renovar token')
        const error = new Error('Token inválido ou expirado')
        ;(error as any).statusCode = 401
        ;(error as any).code = 'UNAUTHORIZED'
        throw error
      }

      if (!user.active) {
        this.log.warn({ userId: user.id }, 'Usuário inativo tentando renovar token')
        const error = new Error('Usuário inativo')
        ;(error as any).statusCode = 401
        ;(error as any).code = 'INACTIVE_USER'
        throw error
      }

      const accessToken = this.fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          workgroupId: user.workgroupId,
        },
        {
          expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h',
        }
      )

      this.log.info({ userId: user.id }, 'Access token renovado com sucesso')

      return { accessToken }
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) {
        throw err
      }

      this.log.warn({ err }, 'Erro ao verificar refresh token')
      const error = new Error('Token inválido ou expirado')
      ;(error as any).statusCode = 401
      ;(error as any).code = 'UNAUTHORIZED'
      throw error
    }
  }

  /**
   * Valida um access token e retorna o payload decodificado
   * @param token - Access token JWT
   * @returns Payload do token decodificado
   * @throws Error com statusCode 401 para tokens inválidos
   */
  async validateAccessToken(token: string): Promise<{
    userId: string
    email: string
    role: string
    workgroupId: string | null
  }> {
    if (!this.fastify) {
      throw new Error('Fastify instance not set in AuthService')
    }

    try {
      const decoded = this.fastify.jwt.verify<{
        userId: string
        email: string
        role: string
        workgroupId: string | null
      }>(token)

      // Verificar se é um refresh token (não deve ser aceito aqui)
      if ('type' in decoded && decoded.type === 'refresh') {
        this.log.warn('Tentativa de usar refresh token como access token')
        const error = new Error('Token inválido ou expirado')
        ;(error as any).statusCode = 401
        ;(error as any).code = 'UNAUTHORIZED'
        throw error
      }

      return decoded
    } catch (err) {
      this.log.warn({ err }, 'Erro ao validar access token')
      const error = new Error('Token inválido ou expirado')
      ;(error as any).statusCode = 401
      ;(error as any).code = 'UNAUTHORIZED'
      throw error
    }
  }

  /**
   * Gera hash bcrypt de uma senha
   * @param password - Senha em texto plano
   * @returns Hash da senha
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds)
  }
}

export const authService = new AuthService()
