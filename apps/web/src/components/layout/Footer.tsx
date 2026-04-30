import { Link } from 'react-router-dom'
import { LogoIcon } from '@napi-aguas/ui'
import { cn } from '@/lib/utils'
import { Mail, ExternalLink } from 'lucide-react'

interface FooterProps {
  className?: string
}

export const Footer = ({ className }: FooterProps) => {
  return (
    <footer
      className={cn('border-t border-neutral-200 bg-white/80 py-12 backdrop-blur', className)}
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Logo e Sobre */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2">
              <LogoIcon size="sm" aria-hidden="true" />
              <p className="font-semibold text-neutral-700">NAPI Águas</p>
            </div>
            <p className="text-sm text-neutral-600">Novos Arranjos de Pesquisa e Inovação</p>
          </div>

          {/* Links Úteis */}
          <nav aria-label="Links úteis">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Links Úteis</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-neutral-600 transition-colors hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
                >
                  Página Inicial
                </Link>
              </li>
              <li>
                <a
                  href="https://www.iaraucaria.pr.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neutral-600 transition-colors hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
                >
                  Fundação Araucária
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>

          {/* Políticas */}
          <nav aria-label="Políticas">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Políticas</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/privacidade"
                  className="text-neutral-600 transition-colors hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
                >
                  Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to="/termos-de-uso"
                  className="text-neutral-600 transition-colors hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2"
                >
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-500">
          <p>© 2025 NAPI Águas – Novos Arranjos em Pesquisa e Inovação</p>
          <p className="text-neutral-300 pt-2">
            Desenvolvido por{' '}
            <a
              className="hover:text-purple-600 font-semibold"
              href="https://bitapps.com.br"
              target="_blank"
            >
              Bitapps
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
