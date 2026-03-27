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

// Headers válidos com ts e hash presentes; verifyWebhookSignature é mockado sem throw
const validHeaders = () => ({
  'x-signature': 'ts=1711234567,v1=abc123hash',
  'x-request-id': 'req-valid-001',
})

describe('HandleMpWebhook', () => {
  let useCase: HandleMpWebhook

  beforeEach(() => {
    jest.resetAllMocks()
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
        headers: validHeaders(),
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
        headers: validHeaders(),
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
        headers: validHeaders(),
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

    it('should throw DomainException when ts is missing from x-signature', async () => {
      await expect(
        useCase.execute({
          body: makePaymentBody('pay_999'),
          headers: {
            'x-signature': '',
            'x-request-id': 'req-1',
          },
        }),
      ).rejects.toThrow()

      expect(mockMercadoPagoAdapter.verifyWebhookSignature).not.toHaveBeenCalled()
    })

    it('should throw DomainException when dataId is missing', async () => {
      await expect(
        useCase.execute({
          body: { type: 'payment', data: { id: '' } },
          headers: validHeaders(),
        }),
      ).rejects.toThrow()

      expect(mockMercadoPagoAdapter.verifyWebhookSignature).not.toHaveBeenCalled()
    })
  })

  describe('idempotency', () => {
    it('should return early without processing when event already exists', async () => {
      mockPaymentEventRepo.findByExternalId.mockResolvedValue({ id: 'existing-event' })

      await useCase.execute({
        body: makePaymentBody('pay_dup'),
        headers: validHeaders(),
      })

      expect(mockMercadoPagoAdapter.getPaymentStatus).not.toHaveBeenCalled()
      expect(mockSubscriptionRepo.upgrade).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })
  })

  describe('race condition', () => {
    it('documents risk: concurrent webhooks with same id both process when DB check is not atomic', async () => {
      // Ambas as chamadas simultâneas vêem null (DB check não é atômico sem lock)
      // upgrade é chamado 2x — a unique constraint em PaymentEvent é a última defesa no DB real
      mockPaymentEventRepo.findByExternalId.mockResolvedValue(null)
      mockMercadoPagoAdapter.getPaymentStatus.mockResolvedValue({
        externalReference: 'user-race',
        status: 'approved',
      })
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await Promise.all([
        useCase.execute({ body: makePaymentBody('pay_race'), headers: validHeaders() }),
        useCase.execute({ body: makePaymentBody('pay_race'), headers: validHeaders() }),
      ])

      // Documenta o risco: sem transação atômica no application layer,
      // upgrade pode ser chamado 2x. O DB (@@unique em PaymentEvent) é a barreira final.
      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledTimes(2)
    })

    it('should process only once when first webhook saves event before second checks', async () => {
      // Simula sequência: primeiro salva, segundo encontra evento existente
      mockPaymentEventRepo.findByExternalId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'evt-saved' })

      mockMercadoPagoAdapter.getPaymentStatus.mockResolvedValue({
        externalReference: 'user-seq',
        status: 'approved',
      })
      mockSubscriptionRepo.upgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({ body: makePaymentBody('pay_seq'), headers: validHeaders() })
      await useCase.execute({ body: makePaymentBody('pay_seq'), headers: validHeaders() })

      expect(mockSubscriptionRepo.upgrade).toHaveBeenCalledTimes(1)
    })

    it('should handle subscription_preapproval idempotently in sequence', async () => {
      const preapprovalBody = { type: 'subscription_preapproval', data: { id: 'pre_123' } }

      mockPaymentEventRepo.findByExternalId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'evt-pre' })

      mockSubscriptionRepo.findByExternalId.mockResolvedValue({ userId: 'user-down', id: 'sub-1' })
      mockSubscriptionRepo.downgrade.mockResolvedValue(undefined)
      mockPaymentEventRepo.save.mockResolvedValue(undefined)

      await useCase.execute({ body: preapprovalBody, headers: validHeaders() })
      await useCase.execute({ body: preapprovalBody, headers: validHeaders() })

      expect(mockSubscriptionRepo.downgrade).toHaveBeenCalledTimes(1)
    })
  })
})
