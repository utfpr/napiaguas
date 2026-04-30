import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangleIcon, RefreshCcwIcon } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      errorInfo,
    })

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
          <Card className="w-full max-w-2xl border-error/40 bg-error/5">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                  <AlertTriangleIcon
                    className="h-6 w-6 text-error"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold text-error">
                    Algo deu errado
                  </CardTitle>
                  <p className="mt-1 text-sm text-neutral-600">
                    Um erro inesperado ocorreu na aplicação. Tente recarregar a
                    página.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {this.props.showDetails && this.state.error && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-error">
                    Detalhes do Erro (DEV)
                  </p>
                  <pre className="overflow-x-auto text-xs text-neutral-700">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-neutral-700">
                        Component Stack
                      </summary>
                      <pre className="mt-1 overflow-x-auto text-xs text-neutral-600">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCcwIcon className="h-4 w-4" aria-hidden="true" />
                  Tentar novamente
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Recarregar página
                </Button>

                <Button
                  onClick={() => (window.location.href = '/')}
                  variant="ghost"
                >
                  Voltar para Home
                </Button>
              </div>

              <p className="text-xs text-neutral-500">
                Se o problema persistir, entre em contato com o suporte técnico
                informando o horário e ação que causou o erro.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}
