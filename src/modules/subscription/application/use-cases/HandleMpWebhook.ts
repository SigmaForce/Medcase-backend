import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DomainException } from '../../../../errors/domain-exception'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { IPaymentEventRepository } from '../../domain/interfaces/payment-event-repository.interface'
import { MercadoPagoAdapter } from '../../infrastructure/adapters/mercadopago.adapter'
import { SubscriptionUpgradedEvent } from '../../domain/events/subscription-upgraded.event'
import { SubscriptionDowngradedEvent } from '../../domain/events/subscription-downgraded.event'
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event'

export interface HandleMpWebhookInput {
  body: {
    type?: string
    action?: string
    data?: { id?: string }
  }
  headers: Record<string, string>
}

@Injectable()
export class HandleMpWebhook {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject('IPaymentEventRepository')
    private readonly paymentEventRepo: IPaymentEventRepository,
    private readonly mercadoPagoAdapter: MercadoPagoAdapter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute({ body, headers }: HandleMpWebhookInput): Promise<void> {
    const xSignature = headers['x-signature'] ?? ''
    const xRequestId = headers['x-request-id'] ?? ''
    const dataId = body.data?.id ?? ''
    const ts = this.extractTs(xSignature)
    const hash = this.extractHash(xSignature)

    if (!ts || !hash || !dataId) {
      throw new DomainException('INVALID_WEBHOOK_SIGNATURE', 401)
    }
    this.mercadoPagoAdapter.verifyWebhookSignature({ dataId, xRequestId, ts, hash })

    const topic = body.type ?? body.action ?? ''
    const eventId = `mp_${topic}_${dataId}`

    const existing = await this.paymentEventRepo.findByExternalId('mercadopago', eventId)
    if (existing) return

    await this.handleTopic(topic, dataId)

    await this.paymentEventRepo.save({
      provider: 'mercadopago',
      eventType: topic,
      externalId: eventId,
      rawPayload: body as Record<string, unknown>,
    })
  }

  private async handleTopic(topic: string, dataId: string): Promise<void> {
    if (topic === 'payment') {
      const payment = await this.mercadoPagoAdapter.getPaymentStatus(dataId)
      const userId = payment.externalReference
      if (!userId) return

      if (payment.status === 'approved') {
        await this.subscriptionRepo.upgrade(userId, {
          plan: 'pro',
          status: 'active',
          provider: 'mercadopago',
          externalSubId: dataId,
          externalCustomer: dataId,
        })
        this.eventEmitter.emit('subscription.upgraded', new SubscriptionUpgradedEvent(userId, 'mercadopago'))
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        this.eventEmitter.emit('payment.failed', new PaymentFailedEvent(userId, 'mercadopago'))
      }
      return
    }

    if (topic === 'subscription_preapproval') {
      const sub = await this.subscriptionRepo.findByExternalId(dataId)
      if (!sub) return
      this.eventEmitter.emit('subscription.downgraded', new SubscriptionDowngradedEvent(sub.userId, 'mercadopago'))
      await this.subscriptionRepo.downgrade(sub.userId)
    }
  }

  private extractTs(xSignature: string): string {
    const match = /ts=([^,]+)/.exec(xSignature)
    return match?.[1] ?? ''
  }

  private extractHash(xSignature: string): string {
    const match = /v1=([^,]+)/.exec(xSignature)
    return match?.[1] ?? ''
  }
}
