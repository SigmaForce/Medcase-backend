import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { ZodError } from 'zod'
import { Response } from 'express'
import { DomainException } from '../../../errors/domain-exception'

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    if (exception instanceof DomainException) {
      return response.status(exception.statusCode).json({
        error: exception.code,
        ...(exception.detail ? { detail: exception.detail } : {}),
      })
    }

    if (exception instanceof ZodError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        error: 'VALIDATION_ERROR',
        issues: exception.issues,
      })
    }

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse())
    }

    this.logger.error('Unhandled exception', { exception })
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'INTERNAL_ERROR' })
  }
}
