import * as React from 'react'

import { cn } from '@/lib/utils'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-neutral-200/60 dark:bg-neutral-700/40', className)}
      {...props}
    />
  )
}
