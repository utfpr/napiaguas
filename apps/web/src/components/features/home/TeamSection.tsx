import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Droplets, Heart, LucideIcon, Truck, Users, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  COMPLEMENTARY_TEAMS,
  PROJECT_COORDINATION,
  WORKGROUP_TEAMS,
  type TeamGroup,
  type TeamRole,
} from '@/data/equipe-executora'

const WORKGROUP_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  'agua-doce': { icon: Droplets, color: 'text-blue-600' },
  litoral: { icon: Waves, color: 'text-cyan-600' },
  saude: { icon: Heart, color: 'text-red-600' },
  transportes: { icon: Truck, color: 'text-orange-600' },
}

const DEFAULT_ICON = { icon: Users, color: 'text-primary-dark' }

interface TeamRoleBlockProps {
  role: TeamRole
  roleIndex: number
}

const TeamRoleBlock = ({ role, roleIndex }: TeamRoleBlockProps) => {
  return (
    <div>
      {role.label && <h4 className="mb-2 text-sm font-semibold text-neutral-500">{role.label}</h4>}
      <ul className="space-y-3">
        {role.members.map((member) => {
          const details = [member.affiliation, member.period].filter(Boolean).join(' · ')

          return (
            <li key={`${roleIndex}-${member.name}`}>
              <p className="font-medium text-neutral-900">{member.name}</p>
              {details && <p className="text-sm text-neutral-600">{details}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface TeamGroupCardProps {
  group: TeamGroup
}

const TeamGroupCard = ({ group }: TeamGroupCardProps) => {
  const { icon: Icon, color } = WORKGROUP_ICONS[group.id] ?? DEFAULT_ICON

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className={cn('flex-shrink-0 rounded-lg bg-primary/10 p-2', color)}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl leading-snug text-neutral-900">{group.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {group.roles.map((role, roleIndex) => (
          <TeamRoleBlock key={role.label ?? roleIndex} role={role} roleIndex={roleIndex} />
        ))}
      </CardContent>
    </Card>
  )
}

export const TeamSection = () => {
  return (
    <section id="equipe-executora" className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-neutral-900 md:text-4xl">
            Equipe Executora do Projeto
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600">
            Pesquisadores e colaboradores responsáveis pelo desenvolvimento do NAPI Águas
          </p>
        </div>

        <div className="space-y-8">
          <Card className="border-l-4 border-l-primary-dark">
            <CardHeader>
              <CardTitle className="text-xl leading-snug text-neutral-900">
                {PROJECT_COORDINATION.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {PROJECT_COORDINATION.roles.map((role, roleIndex) => (
                  <TeamRoleBlock key={role.label ?? roleIndex} role={role} roleIndex={roleIndex} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {WORKGROUP_TEAMS.map((group) => (
              <TeamGroupCard key={group.id} group={group} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {COMPLEMENTARY_TEAMS.map((group) => (
              <TeamGroupCard key={group.id} group={group} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
