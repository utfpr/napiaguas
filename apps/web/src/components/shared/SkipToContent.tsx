// Link visível apenas quando focado via teclado, necessário para acessibilidade (WCAG 2.1 AA).
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      Pular para o conteúdo principal
    </a>
  )
}
