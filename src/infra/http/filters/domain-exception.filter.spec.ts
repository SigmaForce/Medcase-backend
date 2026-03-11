import { HttpException, HttpStatus } from '@nestjs/common'
import { z } from 'zod'
import { DomainExceptionFilter } from './domain-exception.filter'
import { DomainException } from '../../../errors/domain-exception'

const makeHost = (jsonFn: jest.Mock, statusFn?: jest.Mock) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jsonFn,
  }
  if (statusFn) res.status = statusFn.mockReturnValue({ json: jsonFn })

  return {
    switchToHttp: () => ({ getResponse: () => res }),
  }
}

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter

  beforeEach(() => {
    filter = new DomainExceptionFilter()
  })

  it('handles DomainException with statusCode and code', () => {
    const jsonFn = jest.fn()
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
    }

    filter.catch(new DomainException('EMAIL_ALREADY_EXISTS', 409), host as any)
    expect(statusFn).toHaveBeenCalledWith(409)
    expect(jsonFn).toHaveBeenCalledWith({ error: 'EMAIL_ALREADY_EXISTS' })
  })

  it('includes detail when DomainException has it', () => {
    const jsonFn = jest.fn()
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
    }

    filter.catch(new DomainException('BAD', 400, 'extra info'), host as any)
    expect(jsonFn).toHaveBeenCalledWith({ error: 'BAD', detail: 'extra info' })
  })

  it('handles ZodError with 400 and VALIDATION_ERROR', () => {
    const jsonFn = jest.fn()
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
    }

    let zodErr: z.ZodError
    try { z.string().parse(123) } catch (e) { zodErr = e as z.ZodError }
    filter.catch(zodErr!, host as any)

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: 'VALIDATION_ERROR' }))
  })

  it('handles HttpException by delegating status and response', () => {
    const jsonFn = jest.fn()
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
    }

    const httpErr = new HttpException({ message: 'Not Found' }, 404)
    filter.catch(httpErr, host as any)

    expect(statusFn).toHaveBeenCalledWith(404)
  })

  it('handles unknown errors with 500 INTERNAL_ERROR', () => {
    const jsonFn = jest.fn()
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn })
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status: statusFn }) }),
    }

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    filter.catch(new Error('unexpected'), host as any)
    consoleSpy.mockRestore()

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(jsonFn).toHaveBeenCalledWith({ error: 'INTERNAL_ERROR' })
  })
})
