import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GTNavigationCardProps {
  title: string
  description: string
  icon: LucideIcon
  stats: string
  href: string
  className?: string
  iconColor?: string
}

export const GTNavigationCard = ({
  title,
  description,
  icon: Icon,
  stats,
  href,
  className,
  iconColor = 'text-primary-dark',
}: GTNavigationCardProps) => {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-neutral-200 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
        className,
      )}
    >
      {/* Ícone */}
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            'rounded-lg bg-primary/10 p-3 transition-colors duration-200 group-hover:bg-primary/20',
            iconColor,
          )}
        >
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mb-4 space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
        <p className="text-sm font-medium text-primary-dark">{stats}</p>
      </div>

      {/* Botão de ação */}
      <Button
        asChild
        variant="ghost"
        className="group/btn w-full justify-between text-primary-dark transition-colors duration-200 hover:bg-primary/10 hover:text-primary-dark"
      >
        <Link to={href}>
          <span>Acessar</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </Link>
      </Button>

      {/* Linha decorativa */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary-dark transition-all duration-200 group-hover:w-full" />
    </Card>
  )
}
