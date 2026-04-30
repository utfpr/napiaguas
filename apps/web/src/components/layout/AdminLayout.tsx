import { useNavigate, Outlet, Link } from 'react-router-dom'
import { LogOut, Home, Shield } from 'lucide-react'
import { LogoFull } from '@napi-aguas/ui'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WORKGROUP_LABELS: Record<string, string> = {
  'agua-doce': 'Água Doce',
  saude: 'Saúde',
  litoral: 'Litoral',
  transportes: 'Transportes',
}

/**
 * Layout administrativo com header e botão de logout
 * Design semelhante ao Header do site vitrine
 */
export function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header administrativo - estilo similar ao site vitrine */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Badge Admin */}
            <div className="flex items-center gap-4">
              <Link to="/" className="inline-flex items-center" aria-label="Página inicial NAPI Águas">
                <LogoFull className="gap-3 text-left" />
              </Link>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-200">
                <Shield className="h-3.5 w-3.5" />
                Painel Administrativo
              </div>
            </div>

            {/* Desktop: User info + Actions */}
            <div className="hidden md:flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-right">
                    <span className="text-neutral-500">Olá, </span>
                    <span className="font-medium text-neutral-900">{user.name}</span>
                  </div>
                  {user.role === 'admin' ? (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 border border-purple-200">
                      Admin
                    </span>
                  ) : user.workgroupId ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 border border-blue-200">
                      GT {WORKGROUP_LABELS[user.workgroupId] || user.workgroupId}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="h-6 w-px bg-neutral-200" />

              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:bg-primary/10 hover:text-primary-dark"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir para o site
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>

            {/* Mobile: Compact actions */}
            <div className="flex md:hidden items-center gap-2">
              {user && (
                <span className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium border",
                  user.role === 'admin'
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                )}>
                  {user.role === 'admin' ? 'Admin' : `GT ${WORKGROUP_LABELS[user.workgroupId || ''] || ''}`}
                </span>
              )}
              <Link to="/">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 p-0 rounded-full text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo da página */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
