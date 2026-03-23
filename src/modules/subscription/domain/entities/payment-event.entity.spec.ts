import { PaymentEvent } from './payment-event.entity'

describe('PaymentEvent', () => {
  it('should hold all required fields', () => {
    const event = new PaymentEvent()
    event.id = 'evt-1'
    event.userId = 'user-1'
    event.provider = 'stripe'
    event.eventType = 'checkout.session.completed'
    event.externalId = 'cs_test_abc123'
    event.amountCents = 8900
    event.currency = 'BRL'
    event.status = 'paid'
    event.rawPayload = { foo: 'bar' }
    event.processedAt = new Date('2026-01-01T00:00:00Z')

    expect(event.id).toBe('evt-1')
    expect(event.userId).toBe('user-1')
    expect(event.provider).toBe('stripe')
    expect(event.eventType).toBe('checkout.session.completed')
    expect(event.externalId).toBe('cs_test_abc123')
    expect(event.amountCents).toBe(8900)
    expect(event.currency).toBe('BRL')
    expect(event.status).toBe('paid')
    expect(event.rawPayload).toEqual({ foo: 'bar' })
    expect(event.processedAt).toEqual(new Date('2026-01-01T00:00:00Z'))
  })

  it('should allow nullable optional fields', () => {
    const event = new PaymentEvent()
    event.id = 'evt-2'
    event.userId = null
    event.provider = 'mercadopago'
    event.eventType = 'payment'
    event.externalId = 'mp_payment_999'
    event.amountCents = null
    event.currency = null
    event.status = null
    event.rawPayload = {}
    event.processedAt = new Date()

    expect(event.userId).toBeNull()
    expect(event.amountCents).toBeNull()
    expect(event.currency).toBeNull()
    expect(event.status).toBeNull()
  })
})
