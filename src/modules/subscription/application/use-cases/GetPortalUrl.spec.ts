jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
    APP_URL: 'https://app.revalidai.com',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_PRICE_ID_PRO: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
  },
}))

import { GetPortalUrl } from './GetPortalUrl'
import { StripeAdapter } from '../../infrastructure/adapters/stripe.adapter'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { Subscription } from '../../domain/entities/subscription.entity'

const makeSubscriptionRepo = (): jest.Mocked<ISubscriptionRepository> =>
  ({
    findUserById: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    findByExternalId: jest.fn(),
    findByExternalCustomer: jest.fn(),
    update: jest.fn(),
    upgrade: jest.fn(),
    downgrade: jest.fn(),
    resetUsage: jest.fn(),
    findDueForReset: jest.fn(),
  }) as jest.Mocked<ISubscriptionRepository>

const makeStripeAdapter = (): jest.Mocked<StripeAdapter> =>
  ({ createBillingPortalSession: jest.fn(), retrieveCustomerIdFromSubscription: jest.fn() }) as never

const makeStripeSub = (overrides: Partial<Subscription> = {}): Subscription => {
  const sub = Subscription.createFree('user-1')
  sub.provider = 'stripe'
  sub.externalCustomer = 'cus_test'
  return Object.assign(sub, overrides)
}

const makeMpSub = (): Subscription => {
  const sub = Subscription.createFree('user-1')
  sub.provider = 'mercadopago'
  sub.externalCustomer = null
  return sub
}

describe('GetPortalUrl', () => {
  let useCase: GetPortalUrl
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let stripeAdapter: jest.Mocked<StripeAdapter>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    stripeAdapter = makeStripeAdapter()
    useCase = new GetPortalUrl(subscriptionRepo, stripeAdapter)
  })

  describe('stripe provider (country BR)', () => {
    it('should call StripeAdapter.createBillingPortalSession and return portal URL', async () => {
      subscriptionRepo.findByUserId.mockResolvedValue(makeStripeSub())
      stripeAdapter.createBillingPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test',
      })

      const result = await useCase.execute({ userId: 'user-1' })

      expect(stripeAdapter.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_test',
        'https://app.revalidai.com/dashboard',
      )
      expect(result).toEqual({
        portal_url: 'https://billing.stripe.com/session/test',
        provider: 'stripe',
      })
    })

    it('should recover customer ID from Stripe when externalCustomer is missing but externalSubId exists', async () => {
      const sub = makeStripeSub({ externalCustomer: null, externalSubId: 'sub_test' })
      subscriptionRepo.findByUserId.mockResolvedValue(sub)
      stripeAdapter.retrieveCustomerIdFromSubscription.mockResolvedValue('cus_recovered')
      stripeAdapter.createBillingPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test',
      })

      const result = await useCase.execute({ userId: 'user-1' })

      expect(stripeAdapter.retrieveCustomerIdFromSubscription).toHaveBeenCalledWith('sub_test')
      expect(subscriptionRepo.update).toHaveBeenCalled()
      expect(stripeAdapter.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_recovered',
        'https://app.revalidai.com/dashboard',
      )
      expect(result).toEqual({ portal_url: 'https://billing.stripe.com/session/test', provider: 'stripe' })
    })

    it('should throw NO_PORTAL_AVAILABLE when both externalCustomer and externalSubId are missing', async () => {
      subscriptionRepo.findByUserId.mockResolvedValue(
        makeStripeSub({ externalCustomer: null, externalSubId: null }),
      )

      await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
        new DomainException('NO_PORTAL_AVAILABLE', 404),
      )
      expect(stripeAdapter.createBillingPortalSession).not.toHaveBeenCalled()
    })
  })

  describe('mercadopago provider (country PY)', () => {
    it('should return static MercadoPago portal URL without calling Stripe', async () => {
      subscriptionRepo.findByUserId.mockResolvedValue(makeMpSub())

      const result = await useCase.execute({ userId: 'user-1' })

      expect(stripeAdapter.createBillingPortalSession).not.toHaveBeenCalled()
      expect(result).toEqual({
        portal_url: 'https://www.mercadopago.com.br/subscriptions',
        provider: 'mercadopago',
      })
    })
  })

  describe('subscription not found', () => {
    it('should throw NO_PORTAL_AVAILABLE when subscription is null', async () => {
      subscriptionRepo.findByUserId.mockResolvedValue(null)

      await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
        new DomainException('NO_PORTAL_AVAILABLE', 404),
      )
    })

    it('should throw NO_PORTAL_AVAILABLE when subscription has no provider', async () => {
      const sub = Subscription.createFree('user-1')
      sub.provider = null
      subscriptionRepo.findByUserId.mockResolvedValue(sub)

      await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
        new DomainException('NO_PORTAL_AVAILABLE', 404),
      )
    })
  })
})
