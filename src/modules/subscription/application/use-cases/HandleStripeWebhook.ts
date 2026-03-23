import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import Stripe from 'stripe'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { IPaymentEventRepository } from '../../domain/interfaces/payment-event-repository.interface'
import { StripeAdapter } from '../../infrastructure/adapters/stripe.adapter'
import { SubscriptionUpgradedEvent } from '../../domain/events/subscription-upgraded.event'
import { SubscriptionDowngradedEvent } from '../../domain/events/subscription-downgraded.event'
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event'

export interface HandleStripeWebhookInput {
  rawBody: Buffer
  signature: string
}

@Injectable()
export class HandleStripeWebhook {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject('IPaymentEventRepository')
    private readonly paymentEventRepo: IPaymentEventRepository,
    private readonly stripeAdapter: StripeAdapter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute({ rawBody, signature }: HandleStripeWebhookInput): Promise<void> {
    let event: Stripe.Event
    try {
      event = this.stripeAdapter.constructWebhookEvent(rawBody, signature)
    } catch {
      throw new UnauthorizedException('INVALID_STRIPE_SIGNATURE')
    }

    const existing = await this.paymentEventRepo.findByExternalId('stripe', event.id)
    if (existing) return

    await this.handleEvent(event)

    await this.paymentEventRepo.save({
      provider: 'stripe',
      eventType: event.type,
      externalId: event.id,
      rawPayload: event as unknown as Record<string, unknown>,
    })
  }

  private async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) return
        await this.subscriptionRepo.upgrade(userId, {
          plan: 'pro',
          status: 'active',
          provider: 'stripe',
          externalSubId: session.subscription as string,
          externalCustomer: session.customer as string,
        })
        this.eventEmitter.emit('subscription.upgraded', new SubscriptionUpgradedEvent(userId, 'stripe'))
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = await this.subscriptionRepo.findByExternalCustomer(invoice.customer as string)
        if (sub) await this.subscriptionRepo.resetUsage(sub.userId)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = await this.subscriptionRepo.findByExternalCustomer(invoice.customer as string)
        if (!sub) return
        const updated = await this.subscriptionRepo.findByUserId(sub.userId)
        if (updated) {
          updated.status = 'past_due'
          await this.subscriptionRepo.update(updated)
        }
        this.eventEmitter.emit('payment.failed', new PaymentFailedEvent(sub.userId, 'stripe'))
        break
      }
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription
        const sub = await this.subscriptionRepo.findByExternalId(stripeSub.id)
        if (!sub) return
        await this.subscriptionRepo.downgrade(sub.userId)
        this.eventEmitter.emit('subscription.downgraded', new SubscriptionDowngradedEvent(sub.userId, 'stripe'))
        break
      }
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription
        const sub = await this.subscriptionRepo.findByExternalId(stripeSub.id)
        if (!sub) return
        const updated = await this.subscriptionRepo.findByUserId(sub.userId)
        if (updated) {
          updated.cancelAtPeriodEnd = stripeSub.cancel_at_period_end
          await this.subscriptionRepo.update(updated)
        }
        break
      }
      default:
        break
    }
  }
}
