import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { StripeAdapter } from '../../infrastructure/adapters/stripe.adapter'
import { MercadoPagoAdapter } from '../../infrastructure/adapters/mercadopago.adapter'
import { CreateCheckoutDto, createCheckoutSchema } from '../dtos/create-checkout.dto'

export interface CreateCheckoutInput {
  userId: string
  body: unknown
}

export interface CreateCheckoutOutput {
  checkout_url: string
  provider: string
  expires_at: Date
}

@Injectable()
export class CreateCheckout {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly stripeAdapter: StripeAdapter,
    private readonly mercadoPagoAdapter: MercadoPagoAdapter,
  ) {}

  async execute({ userId, body }: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    const dto = createCheckoutSchema.parse(body) as CreateCheckoutDto

    const sub = await this.subscriptionRepo.findByUserId(userId)
    if (sub?.plan === 'pro' && sub.status === 'active') {
      throw new DomainException('ALREADY_PRO', 400)
    }

    const user = await this.subscriptionRepo.findUserById(userId)
    if (!user) throw new DomainException('USER_NOT_FOUND', 404)

    if (user.country === 'BR') {
      const result = await this.stripeAdapter.createCheckoutSession({
        userEmail: user.email,
        userId,
        dto,
      })
      return {
        checkout_url: result.url,
        provider: 'stripe',
        expires_at: result.expiresAt,
      }
    }

    const result = await this.mercadoPagoAdapter.createSubscription({
      userEmail: user.email,
      userId,
      successUrl: dto.success_url,
    })
    return {
      checkout_url: result.url,
      provider: 'mercadopago',
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    }
  }
}
