import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'info' | 'default' | 'destructive'
  message?: string
  onClose?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement

export const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastViewport = React.forwardRef<HTMLDivElement>((props, ref) => <div ref={ref} {...props} />)
export const ToastTitle = ({ children }: { children: React.ReactNode }) => <div className="text-sm font-semibold">{children}</div>
export const ToastDescription = ({ children }: { children: React.ReactNode }) => <div className="text-sm opacity-90">{children}</div>
export const ToastClose = ({ onClick }: { onClick?: () => void }) => (
  <button onClick={onClick} aria-label="Fechar">×</button>
)

ToastViewport.displayName = 'ToastViewport'

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ variant = 'info', message, onClose, children, className, ...props }, ref) => {
    const variantStyles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      default: 'bg-gray-50 border-gray-200 text-gray-800',
      destructive: 'bg-red-50 border-red-200 text-red-800',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'fixed bottom-4 right-4 z-50 max-w-md rounded-lg border p-4 shadow-lg',
          'animate-in slide-in-from-bottom-4',
          variantStyles[variant],
          className
        )}
        role="alert"
        {...props}
      >
        {children || (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{message}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }
)

Toast.displayName = 'Toast'
