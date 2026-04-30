import { Card } from '@/components/ui/card'
import { Target, Users, TrendingUp } from 'lucide-react'

export const AboutSection = () => {
  return (
    <section id="sobre-projeto" className="bg-neutral-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-neutral-900 md:text-4xl">Sobre o Projeto</h2>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600">
            Uma iniciativa do NAPI Águas para centralizar dados científicos e apoiar decisões
            estratégicas
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Texto principal */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-2xl font-semibold text-neutral-900">O que é o NAPI?</h3>
              <p className="text-neutral-600">
                O <strong>Novos Arranjos em Pesquisa e Inovação (NAPI)</strong> é uma iniciativa do
                Governo do Paraná focada em pesquisa aplicada e inovação para questões ambientais e
                de saúde pública.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-2xl font-semibold text-neutral-900">Grupos de Trabalho</h3>
              <p className="text-neutral-600">
                A plataforma integra dados de{' '}
                <strong>quatro grupos de trabalho especializados</strong>: Ecossistemas de Água
                Doce, Litoral, Saúde e Infraestrutura de Transportes. Cada grupo produz índices e
                indicadores de vulnerabilidade climática específicos para suas áreas de atuação.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-2xl font-semibold text-neutral-900">Nossa Missão</h3>
              <p className="text-neutral-600">
                Tornar dados científicos complexos acessíveis através de visualizações interativas,
                apoiando gestores públicos, pesquisadores e cidadãos na tomada de decisões baseadas
                em evidências.
              </p>
            </div>
          </div>

          {/* Cards de objetivos */}
          <div className="space-y-4">
            <Card className="border-l-4 border-l-primary-dark p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 text-primary-dark">
                  <Target className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="mb-2 text-lg font-semibold text-neutral-900">Objetivo</h4>
                  <p className="text-sm text-neutral-600">
                    Centralizar e visualizar índices e indicadores de vulnerabilidade climática para
                    apoiar planejamento estratégico e políticas públicas no Paraná.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-secondary p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-secondary/10 p-3 text-secondary-dark">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="mb-2 text-lg font-semibold text-neutral-900">Público-Alvo</h4>
                  <p className="text-sm text-neutral-600">
                    Gestores públicos, pesquisadores acadêmicos, analistas ambientais e cidadãos
                    interessados em dados ambientais do Paraná.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-accent p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3 text-accent-dark">
                  <TrendingUp className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="mb-2 text-lg font-semibold text-neutral-900">Impacto</h4>
                  <p className="text-sm text-neutral-600">
                    Decisões informadas por dados, políticas públicas baseadas em evidências e maior
                    transparência na gestão de setores estratégicos para o estado.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
