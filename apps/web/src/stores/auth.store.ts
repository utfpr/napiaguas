import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authService, AuthError } from '@/services/auth.service'

// Duração da sessão em milissegundos (24 horas)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

interface PublicUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'gt_member'
  workgroupId: string | null
}

interface AuthState {
  user: PublicUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  sessionExpiresAt: number | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
  checkSessionExpiry: () => void
}

/**
 * Store de autenticação usando Zustand com persistência
 *
 * - Dados de sessão persistidos no localStorage
 * - Sessão expira após 24 horas
 * - isAuthenticated calculado baseado na presença de accessToken, user e sessão válida
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiresAt: null,

      /**
       * Faz login com email e senha
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.login(email, password)
          const expiresAt = Date.now() + SESSION_DURATION_MS

          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionExpiresAt: expiresAt,
          })
        } catch (error) {
          const errorMessage =
            error instanceof AuthError
              ? error.message
              : 'Erro ao fazer login. Tente novamente.'

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
            sessionExpiresAt: null,
          })

          throw error
        }
      },

      /**
       * Faz logout (limpa tokens e state)
       */
      logout: async () => {
        try {
          await authService.logout()
        } catch (error) {
          console.warn('Erro ao fazer logout:', error)
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiresAt: null,
          })
        }
      },

      /**
       * Renova o access token usando refresh token do cookie
       * @throws {AuthError} Se refresh falhar (usuário deve fazer login novamente)
       */
      refreshToken: async () => {
        try {
          const response = await authService.refreshAccessToken()
          const expiresAt = Date.now() + SESSION_DURATION_MS

          set({
            accessToken: response.accessToken,
            isAuthenticated: true,
            error: null,
            sessionExpiresAt: expiresAt,
          })
        } catch (error) {
          // Se refresh falhar, limpa state (usuário precisa fazer login novamente)
          get().logout()
          throw error
        }
      },

      /**
       * Limpa mensagem de erro
       */
      clearError: () => {
        set({ error: null })
      },

      /**
       * Verifica se a sessão expirou e faz logout se necessário
       */
      checkSessionExpiry: () => {
        const { sessionExpiresAt, isAuthenticated } = get()

        if (isAuthenticated && sessionExpiresAt && Date.now() > sessionExpiresAt) {
          console.info('Sessão expirada após 24 horas')
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiresAt: null,
          })
        }
      },
    }),
    {
      name: 'napi-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
)
