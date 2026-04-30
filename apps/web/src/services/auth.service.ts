import env from '@/config/env'

const API_BASE_URL = env.apiUrl

// Tipos locais (correspondem aos schemas do backend)
interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'gt_member'
    workgroupId: string | null
  }
}

/**
 * Serviço de autenticação
 * Gerencia login, refresh de tokens e logout
 */
export const authService = {
  /**
   * Faz login com email e senha
   * @throws {AuthError} Se credenciais forem inválidas ou ocorrer erro no servidor
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password } satisfies LoginRequest),
      credentials: 'include', // Importante: envia e recebe cookies
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError('Email ou senha incorretos', 401)
      }

      if (response.status === 400) {
        const error = await response.json()
        throw new AuthError(
          error.message || 'Dados inválidos',
          400
        )
      }

      throw new AuthError('Erro ao fazer login. Tente novamente.', 500)
    }

    return response.json()
  },

  /**
   * Renova o access token usando o refresh token armazenado em cookie
   * @throws {AuthError} Se refresh token for inválido ou expirado
   */
  async refreshAccessToken(): Promise<{ accessToken: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Envia refresh token do cookie
    })

    if (!response.ok) {
      throw new AuthError('Sessão expirada. Faça login novamente.', 401)
    }

    return response.json()
  },

  /**
   * Faz logout (limpa tokens)
   * Nota: Backend pode implementar invalidação de refresh token em story futura
   */
  async logout(): Promise<void> {
    // Chamar endpoint de logout se implementado no futuro
    // Por enquanto, apenas limpa state local
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      // Ignorar erros de logout - state local será limpo de qualquer forma
      console.warn('Erro ao fazer logout no backend:', error)
    }
  },
}

/**
 * Erro customizado para autenticação
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
