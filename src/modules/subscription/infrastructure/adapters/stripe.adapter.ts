import { Injectable } from '@nestjs/common'
import Stripe from 'stripe'
import { env } from '../../../../config/env'
import { CreateCheckoutDto } from '../../application/dtos/create-checkout.dto'

export interface CheckoutResult {
  url: string
  sessionId: string
  expiresAt: Date
}

export interface PortalResult {
  url: string
}

@Injectable()
export class StripeAdapter {
  private readonly stripe = new Stripe(env.STRIPE_SECRET_KEY)

  async createCheckoutSession(params: {
    userEmail: string
    userId: string
    dto: CreateCheckoutDto
  }): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: params.userId },
      },
      customer_email: params.userEmail,
      success_url: params.dto.success_url,
      cancel_url: params.dto.cancel_url,
      metadata: { user_id: params.userId },
    })

    return {
      url: session.url ?? '',
      sessionId: session.id,
      expiresAt: new Date((session.expires_at ?? 0) * 1000),
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  }

  async createBillingPortalSession(externalCustomer: string, returnUrl: string): Promise<PortalResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: externalCustomer,
      return_url: returnUrl,
    })
    return { url: session.url }
  }
}
