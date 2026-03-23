jest.mock('src/config/env', () => ({
  env: {
    MP_ACCESS_TOKEN: 'APP_USR_fake',
    MP_WEBHOOK_SECRET: 'mp_secret_fake',
  },
}))

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  PreApproval: jest.fn().mockImplementation(() => ({})),
  Payment: jest.fn().mockImplementation(() => ({})),
}))

import { HandleMpWebhook } from './HandleMpWebhook'

const mockSubscriptionRepo = {
  findByExternalId: jest.fn(),
  upgrade: jest.fn(),
  downgrade: jest.fn(),
}

const mockPaymentEventRepo = {
  findByExternalId: jest.fn(),
  save: jest.fn(),
}

const mockMercadoPagoAdapter = {
  verifyWebhookSignature: jest.fn(),
  getPaymentStatus: jest.fn(),
}

const mockEventEmitter = {
  emit: jest.fn(),
}

const makePaymentBody = (dataId: string) => ({
  type: 'payment',
  data: { id: dataId },
})

const makeHeaders = () => ({
  'x-signature': '',
  'x-request-id': '',
})

describe('HandleMpWebhook', () => {
  let useCase: HandleMpWebhook

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new HandleMpWebhook(
      mockSubscriptionRepo as never,
      mockPaymentEventRepo as never,
      mockMercadoPagoAdapter as never,
      mockEventEmitter as never,
    )
  })

  describe('payment approved', () => {
    it('should upgrade subscription and emit SubscriptionUpgradedEvent', async () => {
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockMercadoPagoAdapter.getPaymentStatus.mockResolvedValue({
        externalReference: 'user-1',
        status: 'approved',
      })
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({
        body: makePaymentBody('pay_123'),
        headers: makeHeaders(),
      })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledWith('user-1', {
        plan: 'pro',
        status: 'active',
        provider: 'mercadopago',
        externalSubId: 'pay_123',
        externalCustomer: 'pay_123',
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'subscription.upgraded',
        expect.objectContaining({ userId: 'user-1', provider: 'mercadopago' }),
      )
    })
  })

  describe('payment rejected', () => {
    it('should emit PaymentFailedEvent for rejected payment', async () => {
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockMercadoPagoAdapter.getPaymentStatus.mockResolvedValue({
        externalReference: 'user-2',
        status: 'rejected',
      })
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({
        body: makePaymentBody('pay_rejected'),
        headers: makeHeaders(),
      })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ userId: 'user-2', provider: 'mercadopago' }),
      )
      expect(mockSubscriptionRepo.upgrade).not.toHaveBeenCalled()
    })

    it('should emit PaymentFailedEvent for cancelled payment', async () => {
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockMercadoPagoAdapter.getPaymentStatus.mockResolvedValue({
        externalReference: 'user-3',
        status: 'cancelled',
      })
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({
        body: makePaymentBody('pay_cancelled'),
        headers: makeHeaders(),
      })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ userId: 'user-3', provider: 'mercadopago' }),
      )
    })
  })

  describe('invalid HMAC signature', () => {
    it('should throw when verifyWebhookSignature throws', async () => {
      mockMercadoPagoAdapter.verifyWebhookSignature.mockImplementation(() => {
        throw new Error('INVALID_WEBHOOK_SIGNATURE')
      })

      await expect(
        useCase.execute({
          body: makePaymentBody('pay_999'),
          headers: {
            'x-signature': 'ts=123456,v1=badhash',
            'x-request-id': 'req-1',
          },
        }),
      ).rejects.toThrow('INVALID_WEBHOOK_SIGNATURE')
    })
  })

  describe('idempotency', () => {
    it('should return early without processing when event already exists', async () => {
      mockPaymentEventRepo.findByExternalId.mockResolvedValue({ id: 'existing-event' })

      await useCase.execute({
        body: makePaymentBody('pay_dup'),
        headers: makeHeaders(),
      })

      expect(mockMercadoPagoAdapter.getPaymentStatus).not.toHaveBeenCalled()
      expect(mockSubscriptionRepo.upgrade).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })
  })
})
