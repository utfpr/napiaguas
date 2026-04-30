import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouteObject } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { AguaDocePage } from '@/pages/AguaDocePage'
import { GTLitoralPage } from '@/pages/GTLitoralPage'
import { SaudePage } from '@/pages/SaudePage'
import { TransportesRealDataPage } from '@/pages/TransportesRealDataPage'
import { ExportPage } from '@/pages/ExportPage'
import { LoginPage } from '@/pages/admin/Login'
import { UploadPage } from '@/pages/admin/Upload'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy loading para página de gráficos
const GraficosComitePage = lazy(() =>
  import('@/pages/agua-doce/GraficosComitePage').then((module) => ({
    default: module.GraficosComitePage,
  })),
)

const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'agua-doce',
        element: <AguaDocePage />,
      },
      {
        path: 'agua-doce/graficos',
        element: (
          <Suspense fallback={<Skeleton className="h-[400px] w-full m-6" />}>
            <GraficosComitePage />
          </Suspense>
        ),
      },
      {
        path: 'gt-litoral',
        element: <GTLitoralPage />,
      },
      {
        path: 'litoral',
        element: <GTLitoralPage />,
      },
      {
        path: 'saude',
        element: <SaudePage />,
      },
      {
        path: 'transportes',
        element: <TransportesRealDataPage />,
      },
      {
        path: 'export',
        element: <ExportPage />,
      },
    ],
  },
  // Rotas administrativas
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <UploadPage />,
      },
      {
        path: 'upload',
        element: <UploadPage />,
      },
    ],
  },
  // Rota 404 - Página não encontrada (deve ser a última)
  {
    path: '*',
    element: <NotFoundPage />,
  },
]

export const router = createBrowserRouter(routes) as ReturnType<typeof createBrowserRouter>
