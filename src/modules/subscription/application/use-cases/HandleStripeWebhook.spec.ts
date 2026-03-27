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
  create: jest.fn(),
  findDueForReset: jest.fn(),
}

const mockPaymentEventRepo = {
  findByExternalId: jest.fn(),
  save: jest.fn(),
  updateStatus: jest.fn(),
}

const mockStripeAdapter = {
  constructWebhookEvent: jest.fn(),
  retrieveSubscription: jest.fn(),
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
    object: { id: subId, customer: 'cus_stripe_456' },
  },
})

const makeSubscriptionUpdatedEvent = (subId: string, overrides: Record<string, unknown> = {}) => ({
  id: 'evt_sub_updated_001',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: subId,
      customer: 'cus_stripe_456',
      cancel_at_period_end: true,
      trial_end: 1780000000,
      items: { data: [{ current_period_end: 1800000000 }] },
      ...overrides,
    },
  },
})

const makeStripeSubscription = (overrides: Record<string, unknown> = {}) => ({
  trial_end: 1780000000,
  items: { data: [{ current_period_end: 1800000000 }] },
  ...overrides,
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
    it('should upgrade subscription with trialEndsAt and currentPeriodEnd from Stripe', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-1')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockStripeAdapter.retrieveSubscription.mockResolvedValue(makeStripeSubscription())
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockStripeAdapter.retrieveSubscription).toHaveBeenCalledWith('sub_stripe_123')
      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledWith('user-1', {
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        externalSubId: 'sub_stripe_123',
        externalCustomer: 'cus_stripe_456',
        trialEndsAt: new Date(1780000000 * 1000),
        currentPeriodEnd: new Date(1800000000 * 1000),
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.upgraded',
        expect.objectContaining({ userId: 'user-1', provider: 'stripe' }),
      )
    })

    it('should set trialEndsAt to null when Stripe subscription has no trial', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-1')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockStripeAdapter.retrieveSubscription.mockResolvedValue(makeStripeSubscription({ trial_end: null }))
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ trialEndsAt: null }),
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
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ userId: 'user-2', provider: 'stripe' }),
      )
    })
  })

  describe('customer.subscription.updated', () => {
    it('should sync cancelAtPeriodEnd, currentPeriodEnd and trialEndsAt for active subscription', async () => {
      const stripeEvent = makeSubscriptionUpdatedEvent('sub_stripe_123', { status: 'active' })
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-1' })
      mockSubscriptionRepo.findByUserId.mockResolvedValue({
        userId: 'user-1',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      })
      mockSubscriptionRepo.update.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(1800000000 * 1000),
          trialEndsAt: new Date(1780000000 * 1000),
        }),
      )
      expect(mockSubscriptionRepo.downgrade).not.toHaveBeenCalled()
    })

    it('should downgrade immediately when trialing subscription is cancelled at period end', async () => {
      const stripeEvent = makeSubscriptionUpdatedEvent('sub_stripe_123', {
        status: 'trialing',
        cancel_at_period_end: true,
      })
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-1' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledWith('user-1')
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.downgraded',
        expect.objectContaining({ userId: 'user-1', provider: 'stripe' }),
      )
      expect(mockSubscriptionRepo.update).not.toHaveBeenCalled()
    })

    it('should downgrade immediately when subscription status is canceled', async () => {
      const stripeEvent = makeSubscriptionUpdatedEvent('sub_stripe_123', {
        status: 'canceled',
        cancel_at_period_end: false,
      })
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-1' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledWith('user-1')
      expect(mockSubscriptionRepo.update).not.toHaveBeenCalled()
    })

    it('should fallback to findByExternalCustomer when findByExternalId returns null', async () => {
      const stripeEvent = makeSubscriptionUpdatedEvent('sub_stripe_123', { status: 'active' })
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalCustomer.mockResolvedValue({ userId: 'user-1' })
      mockSubscriptionRepo.findByUserId.mockResolvedValue({ userId: 'user-1', cancelAtPeriodEnd: false })
      mockSubscriptionRepo.update.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.findByExternalCustomer).toHaveBeenCalled()
      expect(mockSubscriptionRepo.update).toHaveBeenCalled()
    })

    it('should set trialEndsAt to null when trial_end is absent', async () => {
      const stripeEvent = makeSubscriptionUpdatedEvent('sub_stripe_123', { status: 'active', trial_end: null })
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-1' })
      mockSubscriptionRepo.findByUserId.mockResolvedValue({ userId: 'user-1', cancelAtPeriodEnd: false })
      mockSubscriptionRepo.update.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ trialEndsAt: null }),
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
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledWith('user-3')
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.downgraded',
        expect.objectContaining({ userId: 'user-3', provider: 'stripe' }),
      )
    })

    it('should fallback to findByExternalCustomer when findByExternalId returns null', async () => {
      const stripeEvent = makeSubscriptionDeletedEvent('sub_to_delete')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.findByExternalCustomer.mockResolvedValue({ userId: 'user-3' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.findByExternalCustomer).toHaveBeenCalledWith('cus_stripe_456')
      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledWith('user-3')
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
    it('should return early without processing when event already has status processed', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-1')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue({ id: 'existing', status: 'processed' })

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
      expect(mockPaymentEventRepo.save).not.toHaveBeenCalled()
    })

    it('should save event with status processing BEFORE calling handleEvent', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-order')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      const callOrder: string[] = []
      mockPaymentEventRepo.save.mockImplementation(() => {
        callOrder.push('save')
        return Promise.resolve(undefined)
      })
      mockStripeAdapter.retrieveSubscription.mockImplementation(() => {
        callOrder.push('handleEvent')
        return Promise.resolve({ trial_end: null, items: { data: [] } })
      })

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(callOrder[0]).toBe('save')
      expect(callOrder[1]).toBe('handleEvent')
      expect(mockPaymentEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' }),
      )
      expect(mockPaymentEventRepo.updateStatus).toHaveBeenCalledWith('stripe', stripeEvent.id, 'processed')
    })

    it('should reprocess event with status processing (retry after failure)', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-retry')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      // status is 'processing' — not 'processed' — so should reprocess
      mockPaymentEventRepo.findByExternalId.mockResolvedValue({ id: 'existing', status: 'processing' })
      mockStripeAdapter.retrieveSubscription.mockResolvedValue(makeStripeSubscription())
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalled()
    })
  })

  describe('race condition', () => {
    it('documents risk: concurrent webhooks with same event id both process when DB check is not atomic', async () => {
      // Ambas as chamadas simultâneas vêem null — a unique constraint em PaymentEvent é a última defesa
      const stripeEvent = makeCheckoutSessionEvent('user-race')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)
      mockStripeAdapter.retrieveSubscription.mockResolvedValue(makeStripeSubscription())

      await Promise.all([
        useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' }),
        useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' }),
      ])

      // Documenta o risco: sem lock no application layer, upgrade pode ser chamado 2x.
      // O DB (@@unique em PaymentEvent) garante idempotência no nível de persistência.
      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledTimes(2)
    })

    it('should process only once when first webhook saves event before second checks', async () => {
      const stripeEvent = makeCheckoutSessionEvent('user-seq')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'evt-saved', status: 'processed' })
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)
      mockStripeAdapter.retrieveSubscription.mockResolvedValue(makeStripeSubscription())

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })
      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledTimes(1)
    })

    it('should handle subscription.deleted idempotently in sequence', async () => {
      const stripeEvent = makeSubscriptionDeletedEvent('sub_seq')
      mockStripeAdapter.constructWebhookEvent.mockReturnValue(stripeEvent)
      mockPaymentEventRepo.findByExternalId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'evt-del', status: 'processed' })
      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-down' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)
      mockPaymentEventRepo.updateStatus.mockResolvedValue(undefined)

      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })
      await useCase.execute({ rawBody: Buffer.from('{}'), signature: 'sig_valid' })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledTimes(1)
    })
  })
})
