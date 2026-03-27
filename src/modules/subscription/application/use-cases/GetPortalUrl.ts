import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { StripeAdapter } from '../../infrastructure/adapters/stripe.adapter'
import { env } from '../../../../config/env'

export interface GetPortalUrlInput {
  userId: string
}

export interface GetPortalUrlOutput {
  portal_url: string
  provider: string
}

@Injectable()
export class GetPortalUrl {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly stripeAdapter: StripeAdapter,
  ) {}

  async execute({ userId }: GetPortalUrlInput): Promise<GetPortalUrlOutput> {
    const sub = await this.subscriptionRepo.findByUserId(userId)
    if (!sub?.provider) throw new DomainException('NO_PORTAL_AVAILABLE', 404)

    if (sub.provider === 'stripe') {
      let customerId = sub.externalCustomer

      if (!customerId) {
        if (!sub.externalSubId) throw new DomainException('NO_PORTAL_AVAILABLE', 404)
        try {
          customerId = await this.stripeAdapter.retrieveCustomerIdFromSubscription(sub.externalSubId)
          sub.externalCustomer = customerId
          await this.subscriptionRepo.update(sub)
        } catch {
          throw new DomainException('NO_PORTAL_AVAILABLE', 404)
        }
      }

      const result = await this.stripeAdapter.createBillingPortalSession(customerId, `${env.APP_URL}/dashboard`)
      return { portal_url: result.url, provider: 'stripe' }
    }

    return {
      portal_url: 'https://www.mercadopago.com.br/subscriptions',
      provider: 'mercadopago',
    }
  }
}
