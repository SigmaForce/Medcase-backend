jest.mock('src/config/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_fake',
    STRIPE_PRICE_ID_PRO: 'price_fake',
  },
}))

jest.mock('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({})),
}))

import { HandleStripeWebhook } from './HandleStripeWebhook'
import { UnauthorizedException } from '@nestjs/common'

const mockSubscriptionRepo = {
  findByUserId: jest.fn(),
  findByExternalCustomer: jest.fn(),
  findByExternalId: jest.fn(),
  upgrade: jest.fn(),
  downgrade: jest.fn(),
  resetUsage: jest.fn(),
  update: jest.fn(),
}

const mockPaymentEventRepo = {
  findByExternalId: jest.fn(),
  save: jest.fn(),
}

const mockStripeAdapter = {
  constructWebhookEvent: jest.fn(),
}

const mockEventEmitter = {
  emit: jest.fn(),
}

const makeCheckoutSessionEvent = (userId: string) => ({
  id: 'evt_checkout_001',
  type: 'checkout.session.completed',
  data: {
    object: {
      metadata: { user_id: userId },
      subscription: 'sub_stripe_123',
      customer: 'cus_stripe_456',
    },
  },
})

const makeInvoicePaymentFailedEvent = (customer: string) => ({
  id: 'evt_invoice_fail_001',
  type: 'invoice.payment_failed',
  data: {
    object: { customer },
  },
})

const makeSubscriptionDeletedEvent = (subId: string) => ({
  id: 'evt_sub_deleted_001',
  type: 'customer.subscription.deleted',
  data: {
    object: { id: subId },
  },
})

describe('HandleStripeWebhook', () => {
  let useCase: HandleStripeWebhook

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new HandleStripeWebhook(
      mockSubscriptionRepo as never,
      mockPaymentEventRepo as never,
      mockStripeAdapter as never,
      mockEventEmitter as never,
    )
  })

  describe('checkout.session.completed', () => {
    it('should upgrade subscription and emit SubscriptionUpgradedEvent', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-1')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledWith('user-1', {
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        externalSubId: 'sub_stripe_123',
        externalCustomer: 'cus_stripe_456',
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.upgraded',
        expect.objectContaining({ userId: 'user-1', provider: 'stripe' }),
      )
    })
  })

  describe('invoice.payment_failed', () => {
    it('should emit PaymentFailedEvent', async () => {
      const stripeEvent = makeInvoicePaymentFailedEvent('cus_abc')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalCustomer.mockResolvedValue({ userId: 'user-2' })
      mockSubscriptionRepo.findByUserId.mockResolvedValue({ status: 'active', userId: 'user-2' })
      mockSubscriptionRepo.update.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ userId: 'user-2', provider: 'stripe' }),
      )
    })
  })

  describe('customer.subscription.deleted', () => {
    it('should downgrade subscription and emit SubscriptionDowngradedEvent', async () => {
      const stripeEvent = makeSubscriptionDeletedEvent('sub_to_delete')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-3' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledWith('user-3')
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.downgraded',
        expect.objectContaining({ userId: 'user-3', provider: 'stripe' }),
      )
    })
  })

  describe('invalid signature', () => {
    it('should throw UnauthorizedException for invalid webhook signature', async () => {
      mockStripeAdapter.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(
        useCase.execute({ rawBody: Buffer.from('{}'), signature: 'bad_sig' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw with INVALID_STRIPE_SIGNATURE message', async () => {
      mockStripeAdapter.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(
        useCase.execute({ rawBody: Buffer.from('{}'), signature: 'bad_sig' }),
      ).rejects.toMatchObject({ message: 'INVALID_STRIPE_SIGNATURE' })
    })
  })

  describe('idempotency', () => {
    it('should return early without processing when externalId already exists', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-1')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue({ id: 'existing' })

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
      expect(mockPaymentEventRepo.save).not.toHaveBeenCalled()
    })
  })
})
