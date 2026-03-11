import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe'

describe('ZodValidationPipe', () => {
  it('returns parsed value when schema is valid', () => {
    const schema = z.object({ name: z.string() })
    const pipe = new ZodValidationPipe(schema)
    const result = pipe.transform({ name: 'Alice' })
    expect(result).toEqual({ name: 'Alice' })
  })

  it('throws ZodError when value does not match schema', () => {
    const schema = z.object({ name: z.string() })
    const pipe = new ZodValidationPipe(schema)
    expect(() => pipe.transform({ name: 123 })).toThrow(z.ZodError)
  })

  it('strips extra fields with .strict() schema', () => {
    const schema = z.object({ email: z.string() }).strict()
    const pipe = new ZodValidationPipe(schema)
    expect(() => pipe.transform({ email: 'a@b.com', extra: 'x' })).toThrow(z.ZodError)
  })
})
