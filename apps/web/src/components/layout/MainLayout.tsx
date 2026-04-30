import { Outlet } from 'react-router-dom'
import { LoadingScreen } from '@napi-aguas/ui'
import { useAppStore } from '@/stores/useAppStore'
import { Header } from './Header'

export const MainLayout = () => {
  const isLoading = useAppStore((state) => state.isLoading)

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-gradient-to-b from-primary/5 via-white to-secondary/5">
      {isLoading ? <LoadingScreen message="Carregando dados da plataforma..." /> : null}

      <div className="flex-shrink-0">
        <Header />
      </div>
      <main id="main-content" className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
