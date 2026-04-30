import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
import { LogoFull } from '@napi-aguas/ui'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/useAppStore'
import { MenuIcon, XIcon } from '@/components/ui/icons'

const workgroups = [
  { id: 'agua-doce', name: 'Água Doce', path: '/agua-doce' },
  { id: 'gt-litoral', name: 'Litoral', path: '/gt-litoral' },
  { id: 'saude', name: 'Saúde', path: '/saude' },
  { id: 'transportes', name: 'Transportes', path: '/transportes' },
]

export const Header = () => {
  const location = useLocation()
  const setSelectedWorkgroup = useAppStore((state) => state.setSelectedWorkgroup)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavClick = (workgroupId?: string) => {
    if (workgroupId) {
      setSelectedWorkgroup(workgroupId)
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center" aria-label="Página inicial NAPI Águas">
            <LogoFull showTagline className="gap-4 text-left" />
          </Link>

          {/* Desktop Navigation - Hidden on mobile/tablet */}
          <nav
            className="hidden lg:flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-700"
            aria-label="Navegação principal"
          >
            {workgroups.map((wg) => {
              const isActive = location.pathname === wg.path

              return (
                <Button
                  key={wg.id}
                  variant={isActive ? 'default' : 'ghost'}
                  asChild
                  className={cn(
                    'rounded-full border border-transparent transition-colors duration-fast',
                    isActive
                      ? 'bg-primary-dark text-white hover:bg-primary-dark/90'
                      : 'hover:bg-primary/10 hover:text-primary-dark',
                  )}
                >
                  <Link
                    to={wg.path}
                    onClick={() => setSelectedWorkgroup(wg.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {wg.name}
                  </Link>
                </Button>
              )
            })}
            <Button
              variant={location.pathname === '/export' ? 'default' : 'outline'}
              asChild
              className={cn(
                'rounded-full border transition-colors duration-fast',
                location.pathname === '/export'
                  ? 'bg-primary-dark text-white hover:bg-primary-dark/90 border-transparent'
                  : 'hover:bg-primary/10 hover:text-primary-dark border-primary/30',
              )}
            >
              <Link
                to="/export"
                aria-current={location.pathname === '/export' ? 'page' : undefined}
              >
                Exportar Dados
              </Link>
            </Button>
          </nav>

          {/* Mobile/Tablet Menu Button */}
          <Drawer.Root
            open={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
            direction="right"
          >
            <Drawer.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-10 w-10 p-0"
                aria-label="Abrir menu de navegação"
              >
                <MenuIcon className="h-6 w-6" />
              </Button>
            </Drawer.Trigger>

            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <Drawer.Content
                className={cn(
                  'fixed bottom-0 right-0 top-0 z-50',
                  'flex w-[280px] max-w-[85vw] flex-col',
                  'border-l border-neutral-200 bg-white',
                  'shadow-xl',
                )}
              >
                {/* Header do Menu Mobile */}
                <div className="flex items-center justify-between border-b border-neutral-200 p-4">
                  <Drawer.Title className="text-lg font-semibold text-neutral-900">
                    Menu
                  </Drawer.Title>
                  <Drawer.Close asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="Fechar menu"
                    >
                      <XIcon className="h-5 w-5" />
                    </Button>
                  </Drawer.Close>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                  {workgroups.map((wg) => {
                    const isActive = location.pathname === wg.path

                    return (
                      <Link
                        key={wg.id}
                        to={wg.path}
                        onClick={() => handleNavClick(wg.id)}
                        className={cn(
                          'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-dark text-white'
                            : 'text-neutral-700 hover:bg-neutral-100',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {wg.name}
                      </Link>
                    )
                  })}

                  <div className="my-2 border-t border-neutral-200" />

                  <Link
                    to="/export"
                    onClick={() => handleNavClick()}
                    className={cn(
                      'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      location.pathname === '/export'
                        ? 'bg-primary-dark text-white'
                        : 'text-neutral-700 hover:bg-neutral-100',
                    )}
                    aria-current={location.pathname === '/export' ? 'page' : undefined}
                  >
                    Exportar Dados
                  </Link>
                </nav>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    </header>
  )
}
