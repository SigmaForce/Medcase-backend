export class PaymentEvent {
  id: string
  userId: string | null
  provider: string
  eventType: string
  externalId: string
  amountCents: number | null
  currency: string | null
  status: string | null
  rawPayload: Record<string, unknown>
  processedAt: Date
}
