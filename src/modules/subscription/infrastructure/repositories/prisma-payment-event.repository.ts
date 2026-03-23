import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IPaymentEventRepository,
  SavePaymentEventParams,
} from '../../domain/interfaces/payment-event-repository.interface'
import { PaymentEvent } from '../../domain/entities/payment-event.entity'

@Injectable()
export class PrismaPaymentEventRepository implements IPaymentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByExternalId(provider: string, externalId: string): Promise<PaymentEvent | null> {
    const record = await this.prisma.paymentEvent.findUnique({
      where: { unique_external_event: { provider, externalId } },
    })
    return record ? this.toDomain(record) : null
  }

  async save(params: SavePaymentEventParams): Promise<PaymentEvent> {
    const record = await this.prisma.paymentEvent.create({
      data: {
        userId: params.userId ?? null,
        provider: params.provider,
        eventType: params.eventType,
        externalId: params.externalId,
        amountCents: params.amountCents ?? null,
        currency: params.currency ?? null,
        status: params.status ?? null,
        rawPayload: params.rawPayload as never,
      },
    })
    return this.toDomain(record)
  }

  private toDomain(record: {
    id: string
    userId: string | null
    provider: string
    eventType: string
    externalId: string
    amountCents: number | null
    currency: string | null
    status: string | null
    rawPayload: unknown
    processedAt: Date
  }): PaymentEvent {
    const event = new PaymentEvent()
    event.id = record.id
    event.userId = record.userId
    event.provider = record.provider
    event.eventType = record.eventType
    event.externalId = record.externalId
    event.amountCents = record.amountCents
    event.currency = record.currency
    event.status = record.status
    event.rawPayload = record.rawPayload as Record<string, unknown>
    event.processedAt = record.processedAt
    return event
  }
}
