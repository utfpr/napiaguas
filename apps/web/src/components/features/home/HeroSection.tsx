import { Button } from '@/components/ui/button'
import { LogoWordmark } from '@napi-aguas/ui'
import { ChevronDown } from 'lucide-react'

export const HeroSection = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="relative min-h-[70vh] overflow-hidden bg-gradient-to-br from-primary/10 via-white to-secondary/10 py-16 md:py-24">
      <div className="container mx-auto flex flex-col gap-12 px-10 text-center md:flex-row md:items-center md:justify-between md:text-left">
        {/* Texto e CTAs */}
        <div className="hero-content flex flex-1 flex-col items-center gap-8 md:items-start">
          <div className="hero-text space-y-4">
            <h1 className="text-4xl font-bold text-neutral-900 md:text-5xl lg:text-6xl">
              NAPI Águas
            </h1>
            <h2 className="text-2xl font-semibold text-primary-dark md:text-3xl">
              Plataforma de mapeamento da vulnerabilidade climática do Paraná
            </h2>
            <p className="text-lg text-neutral-600 md:text-xl">
              Visualize índices e indicadores em setores estratégicos através de mapas interativos.
            </p>
          </div>

          <div className="hero-actions flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => scrollToSection('explorar-gts')}
              className="transition-transform duration-200 hover:scale-105"
            >
              Explorar Grupos de Trabalho
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('sobre-projeto')}
              className="border-primary-dark text-primary-dark transition-transform duration-200 hover:scale-105 hover:text-primary-dark"
            >
              Sobre o Projeto
            </Button>
          </div>

          {/* Indicador de scroll */}
          <button
            onClick={() => scrollToSection('explorar-gts')}
            className="animate-bounce text-primary-dark transition-opacity duration-200 hover:opacity-70"
            aria-label="Rolar para seção de Grupos de Trabalho"
          >
            <ChevronDown className="h-8 w-8" />
          </button>
        </div>

        {/* Logo NAPI à direita */}
        <div className="hero-visual relative flex flex-1 justify-center md:justify-end">
          {/* <LogoWordmark className="hero-logo h-32 w-auto md:h-40 lg:h-72" aria-label="NAPI Águas" /> */}
          <img
            src="/logo-napi-aguas-320.png"
            alt="NAPI Águas"
            className="w-auto md:h-60 lg:h-full"
          />
        </div>
      </div>
    </section>
  )
}
