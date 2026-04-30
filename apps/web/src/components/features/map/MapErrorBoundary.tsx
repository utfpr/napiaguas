import { Component, type ErrorInfo, type ReactNode } from 'react'

interface MapErrorBoundaryProps {
  fallback?: ReactNode | ((error: Error) => ReactNode)
  onError?: (error: Error) => void
  children: ReactNode
}

interface MapErrorBoundaryState {
  error: Error | null
}

export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('MapErrorBoundary capturou um erro', error, errorInfo)
    }
  }

  render(): ReactNode {
    const { error } = this.state
    const { fallback, children } = this.props

    if (!error) {
      return children
    }

    if (typeof fallback === 'function') {
      return fallback(error)
    }

    if (fallback) {
      return fallback
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-red-300 bg-white/90 p-6 text-center shadow-sm backdrop-blur-sm dark:border-red-900/60 dark:bg-neutral-950/80">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">
          Não foi possível renderizar o mapa
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {error.message || 'Ocorreu um erro inesperado durante a renderização do mapa.'}
        </p>
      </div>
    )
  }
}
