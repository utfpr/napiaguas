import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Página 404 - Página não encontrada
 * Exibida quando o usuário acessa uma rota que não existe
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Número 404 grande e destacado */}
        <div className="space-y-2">
          <h1 className="text-9xl font-bold text-sky-600 dark:text-sky-500">
            404
          </h1>
          <div className="h-1 w-24 mx-auto bg-sky-600 dark:bg-sky-500 rounded-full" />
        </div>

        {/* Mensagem principal */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Página não encontrada
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Ir para início
          </Button>
        </div>
      </div>
    </div>
  );
}
