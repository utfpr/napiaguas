import { createElement, type ReactNode } from 'react'
import type { JSX } from 'react'
import { cn } from '@/lib/utils'

type VisuallyHiddenProps<T extends keyof JSX.IntrinsicElements = 'span'> = {
  children: ReactNode
  as?: T
  className?: string
} & Omit<JSX.IntrinsicElements[T], 'className' | 'children'>

// Esconde o conteúdo visualmente mas mantém acessível a leitores de tela.
export function VisuallyHidden<T extends keyof JSX.IntrinsicElements = 'span'>({
  children,
  as = 'span' as T,
  className,
  ...props
}: VisuallyHiddenProps<T>) {
  return createElement(
    as,
    {
      ...props,
      className: cn('sr-only', className),
    },
    children,
  )
}
