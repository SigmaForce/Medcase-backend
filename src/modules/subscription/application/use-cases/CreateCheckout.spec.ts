jest.mock('src/config/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_fake',
    STRIPE_PRICE_ID_PRO: 'price_fake',
    MP_ACCESS_TOKEN: 'APP_USR_fake',
    MP_WEBHOOK_SECRET: 'mp_secret_fake',
  },
}))

jest.mock('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({})),
}))

import { CreateCheckout } from './CreateCheckout'
import { DomainException } from '../../../../errors/domain-exception'

const mockSubscriptionRepo = {
  findByUserId: jest.fn(),
  findUserById: jest.fn(),
}

const mockStripeAdapter = {
  createCheckoutSession: jest.fn(),
}

const mockMercadoPagoAdapter = {
  createSubscription: jest.fn(),
}

const validBody = {
  plan: 'pro',
  success_url: 'https://app.revalidai.com/success',
  cancel_url: 'https://app.revalidai.com/cancel',
}

describe('CreateCheckout', () => {
  let useCase: CreateCheckout

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateCheckout(
      mockSubscriptionRepo as never,
      mockStripeAdapter as never,
      mockMercadoPagoAdapter as never,
    )
  })

  describe('country=BR', () => {
    it('should call StripeAdapter.createCheckoutSession and return stripe provider', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(null)
      mockSubscriptionRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        fullName: 'Test User',
        country: 'BR',
      })
      mockStripeAdapter.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_abc',
        expiresAt: new Date('2026-12-31'),
      })

      const result = await useCase.execute({ userId: 'user-1', body: validBody })

      expect(result.provider).toBe('stripe')
      expect(result.checkout_url).toBe('https://checkout.stripe.com/session_abc')
      expect(mockStripeAdapter.createCheckoutSession).toHaveBeenCalledTimes(1)
      expect(mockMercadoPagoAdapter.createSubscription).not.toHaveBeenCalled()
    })
  })

  describe('country=PY', () => {
    it('should call MercadoPagoAdapter.createSubscription and return mercadopago provider', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(null)
      mockSubscriptionRepo.findUserById.mockResolvedValue({
        id: 'user-2',
        email: 'user@test.com',
        fullName: 'Test User PY',
        country: 'PY',
      })
      mockMercadoPagoAdapter.createSubscription.mockResolvedValue({
        url: 'https://www.mercadopago.com/checkout_py',
      })

      const result = await useCase.execute({ userId: 'user-2', body: validBody })

      expect(result.provider).toBe('mercadopago')
      expect(result.checkout_url).toBe('https://www.mercadopago.com/checkout_py')
      expect(mockMercadoPagoAdapter.createSubscription).toHaveBeenCalledTimes(1)
      expect(mockStripeAdapter.createCheckoutSession).not.toHaveBeenCalled()
    })
  })

  describe('user not found', () => {
    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(null)
      mockSubscriptionRepo.findUserById.mockResolvedValue(null)

      await expect(useCase.execute({ userId: 'user-999', body: validBody })).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should throw a DomainException for missing user', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(null)
      mockSubscriptionRepo.findUserById.mockResolvedValue(null)

      await expect(useCase.execute({ userId: 'user-999', body: validBody })).rejects.toBeInstanceOf(DomainException)
    })
  })

  describe('already pro', () => {
    it('should throw ALREADY_PRO when subscription is active pro', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue({
        plan: 'pro',
        status: 'active',
      })

      await expect(useCase.execute({ userId: 'user-1', body: validBody })).rejects.toMatchObject({
        code: 'ALREADY_PRO',
        statusCode: 400,
      })
    })

    it('should not throw ALREADY_PRO for pro plan with non-active status', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue({
        plan: 'pro',
        status: 'past_due',
      })
      mockSubscriptionRepo.findUserById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        fullName: 'Test User',
        country: 'BR',
      })
      mockStripeAdapter.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_xyz',
        expiresAt: new Date('2026-12-31'),
      })

      const result = await useCase.execute({ userId: 'user-1', body: validBody })
      expect(result.provider).toBe('stripe')
    })
  })
})
