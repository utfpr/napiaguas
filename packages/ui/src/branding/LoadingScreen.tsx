import { cn } from '../utils/cn'
import { LogoIcon, type LogoVariant } from './Logo'

export interface LoadingScreenProps {
  message?: string
  fullscreen?: boolean
  variant?: LogoVariant
  className?: string
}

export const LoadingScreen = ({
  message = 'Carregando plataforma NAPI Águas...',
  fullscreen = true,
  variant = 'color',
  className,
}: LoadingScreenProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-4 bg-white/90 px-6 py-8 text-center text-neutral-700 backdrop-blur',
        fullscreen ? 'fixed inset-0 z-50' : 'rounded-xl shadow-md',
        className,
      )}
    >
      <div className="inline-flex flex-col items-center gap-3">
        <LogoIcon
          variant={variant}
          size="lg"
          className="animate-pulse drop-shadow-lg"
          aria-hidden="true"
        />
        <span className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          NAPI Águas
        </span>
      </div>
      <p className="max-w-xs text-sm text-neutral-600">{message}</p>
      <span className="sr-only">Status: {message}</span>
    </div>
  )
}
