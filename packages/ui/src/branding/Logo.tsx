import { forwardRef } from 'react'
import type { HTMLAttributes, ImgHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

const LOGO_FULL_SRC = '/logo-napi-aguas.svg'
const LOGO_COMPACT_SRC = '/logo-napi-aguas.svg'

const VARIANT_CLASSES = {
  color: '',
  'monochrome-dark': 'filter grayscale contrast-125',
  'monochrome-light': 'filter grayscale invert brightness-150',
} as const

export type LogoVariant = keyof typeof VARIANT_CLASSES

export interface LogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  variant?: LogoVariant
  compact?: boolean
}

export const Logo = forwardRef<HTMLImageElement, LogoProps>(function Logo(
  { className, variant = 'color', compact = false, ...props },
  ref,
) {
  const imageSource = compact ? LOGO_COMPACT_SRC : LOGO_FULL_SRC

  return (
    <img
      ref={ref}
      src={imageSource}
      alt="Logo oficial do NAPI Águas"
      className={cn('h-auto w-full drop-shadow-md', VARIANT_CLASSES[variant], className)}
      loading="lazy"
      {...props}
    />
  )
})

export interface LogoIconProps extends Omit<LogoProps, 'compact'> {
  size?: 'sm' | 'md' | 'lg'
}

const ICON_SIZE_MAP: Record<NonNullable<LogoIconProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export const LogoIcon = forwardRef<HTMLImageElement, LogoIconProps>(function LogoIcon(
  { className, size = 'md', variant = 'color', ...props },
  ref,
) {
  return (
    <Logo
      ref={ref}
      compact
      variant={variant}
      className={cn('h-10 w-10', ICON_SIZE_MAP[size], className)}
      {...props}
    />
  )
})

export interface LogoFullProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant
  showTagline?: boolean
  tagline?: string
  textClassName?: string
}

export function LogoFull({
  className,
  variant = 'color',
  showTagline = false,
  tagline = 'Novos Arranjos de Pesquisa e Inovação',
  textClassName,
  ...rest
}: LogoFullProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-3',
        className,
      )}
      {...rest}
    >
      <LogoIcon
        aria-hidden="true"
        variant={variant}
        className="h-12 w-12 drop-shadow-lg"
      />
      <span className={cn('flex flex-col leading-tight text-neutral-900', textClassName)}>
        <span className="text-lg font-semibold">NAPI Águas</span>
        {showTagline ? (
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  )
}

export interface LogoWordmarkProps extends Omit<LogoProps, 'compact'> {}

export function LogoWordmark({ className, variant = 'color', ...props }: LogoWordmarkProps) {
  return (
    <Logo
      variant={variant}
      className={cn('h-16 w-16', className)}
      compact={false}
      {...props}
    />
  )
}
