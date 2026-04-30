import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

/**
 * Schema de validação do formulário de login
 */
const loginSchema = z.object({
  email: z.string().email('Digite um email válido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const [loginError, setLoginError] = useState<string | null>(null)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Redirect para upload se já autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/upload', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Sincroniza erro do store com estado local
  useEffect(() => {
    if (error) {
      setLoginError(error)
      clearError()
    }
  }, [error, clearError])

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null)

    try {
      await login(data.email, data.password)
      // Navigate será feito pelo useEffect ao detectar isAuthenticated = true
    } catch (err) {
      // Erro já está no state do Zustand, será exibido via useEffect
      console.error('Erro ao fazer login:', err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <img src="/logo-napi-aguas-320.png" alt="Logo" className="h-32 w-32" />
          </div>
          <CardTitle className="text-2xl font-bold">Área Administrativa</CardTitle>
          <CardDescription>Digite suas credenciais para acessar o painel</CardDescription>
        </CardHeader>

        <CardContent>
          {loginError && (
            <Alert className="mb-4 border-red-200 bg-red-50 text-red-800">{loginError}</Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Senha</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
