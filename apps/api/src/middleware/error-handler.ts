import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors,
    })
  }

  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    })
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    })
  }

  if (
    error.message === 'premature close' ||
    error.code === 'ERR_STREAM_PREMATURE_CLOSE'
  ) {
    request.log.warn(
      {
        err: error,
        aborted: request.raw.aborted,
      },
      'Client connection closed prematurely',
    )
    return
  }

  request.log.error(error)
  return reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  })
}
