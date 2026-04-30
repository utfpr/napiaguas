import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Componente que protege rotas administrativas
 * Redireciona para /admin/login se usuário não estiver autenticado ou sessão expirada
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkSessionExpiry } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica se a sessão expirou (24 horas)
    checkSessionExpiry()
  }, [checkSessionExpiry])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return isAuthenticated ? <>{children}</> : null
}
