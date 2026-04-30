import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCcwIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface ErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  icon?: React.ReactNode
  className?: string
}

export function ErrorCard({
  title = 'Erro ao carregar dados',
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  icon,
  className,
}: ErrorCardProps) {
  return (
    <Card
      className={cn(
        'border-error/40 bg-error/5',
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base font-semibold text-error">
          {title}
        </CardTitle>
        {icon || (
          <RefreshCcwIcon
            className="h-5 w-5 text-error"
            aria-hidden="true"
          />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-error/80">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit border-error/40 text-error hover:bg-error/10 hover:text-error"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
