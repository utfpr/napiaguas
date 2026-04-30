import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { ErrorBoundary, SkipToContent } from '@/components/shared'
import { Toaster } from '@/components/ui/toaster'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'

function App() {
  // Habilita detecção de navegação por teclado
  useKeyboardNavigation()

  return (
    <ErrorBoundary>
      <SkipToContent />
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
