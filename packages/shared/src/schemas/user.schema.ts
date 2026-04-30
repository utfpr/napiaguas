import { z } from 'zod'

// Enum de papéis de usuário
export const userRoleSchema = z.enum(['admin', 'gt_member'])

// Schema de usuário (para respostas de API)
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  workgroupId: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Schema de requisição de login
export const loginRequestSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
})

// Schema de resposta de login
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: userRoleSchema,
    workgroupId: z.string().nullable(),
  }),
})

// Schema de requisição de refresh token
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
})

// Schema de resposta de refresh token
export const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
})

// Tipos TypeScript inferidos
export type UserRole = z.infer<typeof userRoleSchema>
export type User = z.infer<typeof userSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>
