import { PaymentEvent } from '../entities/payment-event.entity'

export interface SavePaymentEventParams {
  userId?: string | null
  provider: string
  eventType: string
  externalId: string
  amountCents?: number | null
  currency?: string | null
  status?: string | null
  rawPayload: Record<string, unknown>
}

export interface IPaymentEventRepository {
  findByExternalId(provider: string, externalId: string): Promise<PaymentEvent | null>
  save(params: SavePaymentEventParams): Promise<PaymentEvent>
}
