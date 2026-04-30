import { ErrorBoundary } from '@/components/shared'
import { HeroSection, GTNavigationCard, AboutSection } from '@/components/features/home'
import { Footer } from '@/components/layout/Footer'
import { Droplets, Waves, Heart, Truck } from 'lucide-react'

export const HomePage = () => {
  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto">
        <div className="min-h-screen">
          {/* Hero Section */}
          <HeroSection />

          {/* Seção de Grupos de Trabalho */}
          <section id="explorar-gts" className="bg-white py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold text-neutral-900 md:text-4xl">
                  Grupos de Trabalho
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-neutral-600">
                  Explore os índices e indicadores organizados por grupo de trabalho
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <GTNavigationCard
                  title="GT Ecossistemas de Água Doce"
                  description="Ecossistemas de Água Doce"
                  icon={Droplets}
                  stats="Múltiplas subbacias"
                  href="/agua-doce"
                  iconColor="text-blue-600"
                />
                <GTNavigationCard
                  title="GT Litoral"
                  description="Zona costeira e municípios litorâneos do Paraná"
                  icon={Waves}
                  stats="7 municípios"
                  href="/gt-litoral"
                  iconColor="text-cyan-600"
                />
                <GTNavigationCard
                  title="GT Saúde"
                  description="Indicadores de saúde pública e vulnerabilidade"
                  icon={Heart}
                  stats="399 municípios"
                  href="/saude"
                  iconColor="text-red-600"
                />
                <GTNavigationCard
                  title="GT Infraestrutura de Transportes"
                  description="Trechos rodoviários com análise de vulnerabilidade climática"
                  icon={Truck}
                  stats="Trechos críticos"
                  href="/transportes"
                  iconColor="text-orange-600"
                />
              </div>
            </div>
          </section>

          {/* Seção Sobre o Projeto */}
          <AboutSection />

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </ErrorBoundary>
  )
}
