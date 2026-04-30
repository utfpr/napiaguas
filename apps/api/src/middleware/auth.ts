import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Middleware de autenticação JWT
 * Verifica se o request possui um token válido no header Authorization
 * e anexa os dados do usuário decodificados ao request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verificar se o header Authorization está presente
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado',
        },
      })
    }

    // Verificar o token usando o plugin @fastify/jwt
    // O método jwtVerify() automaticamente extrai o token do header
    await request.jwtVerify()

    // O plugin @fastify/jwt já anexa o payload decodificado em request.user
    // Não é necessário fazer request.user = decoded manualmente

    request.log.debug(
      {
        event: 'auth.verify.success',
        userId: request.user?.userId,
      },
      'Token verificado com sucesso'
    )
  } catch (err) {
    request.log.warn(
      {
        event: 'auth.verify.error',
        err,
      },
      'Falha na verificação do token'
    )

    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido ou expirado',
      },
    })
  }
}
