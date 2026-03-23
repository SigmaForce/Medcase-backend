jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_EMAIL: 'noreply@revalidai.com',
  },
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'email-id' }) },
  })),
}))

import { SubscriptionUpgradedListener } from './subscription-upgraded.listener'
import { SubscriptionUpgradedEvent } from '../../../subscription/domain/events/subscription-upgraded.event'

const mockSubscriptionRepo = {
  findUserById: jest.fn(),
  findByUserId: jest.fn(),
}

const mockEmailService = {
  send: jest.fn(),
}

describe('SubscriptionUpgradedListener', () => {
  let listener: SubscriptionUpgradedListener

  beforeEach(() => {
    jest.clearAllMocks()
    listener = new SubscriptionUpgradedListener(
      mockSubscriptionRepo as never,
      mockEmailService as never,
    )
  })

  it('should call emailService.send with template "upgrade-confirmed" for stripe provider', async () => {
    mockSubscriptionRepo.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'student@test.com',
      fullName: 'João Silva',
      country: 'BR',
    })
    mockSubscriptionRepo.findByUserId.mockResolvedValue({
      currentPeriodEnd: new Date('2027-01-01'),
      trialEndsAt: null,
    })
    mockEmailService.send.mockResolvedValue(undefined)

    const event = new SubscriptionUpgradedEvent('user-1', 'stripe')
    await listener.handle(event)

    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@test.com',
        template: 'upgrade-confirmed',
        data: expect.objectContaining({
          first_name: 'João',
          price: 'R$ 89,00',
        }),
      }),
    )
  })

  it('should call emailService.send with PYG price for mercadopago provider', async () => {
    mockSubscriptionRepo.findUserById.mockResolvedValue({
      id: 'user-2',
      email: 'student@py.com',
      fullName: 'Carlos Gomez',
      country: 'PY',
    })
    mockSubscriptionRepo.findByUserId.mockResolvedValue({
      currentPeriodEnd: null,
      trialEndsAt: new Date('2026-06-01'),
    })
    mockEmailService.send.mockResolvedValue(undefined)

    const event = new SubscriptionUpgradedEvent('user-2', 'mercadopago')
    await listener.handle(event)

    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@py.com',
        template: 'upgrade-confirmed',
        data: expect.objectContaining({
          price: 'PYG 149.000',
        }),
      }),
    )
  })

  it('should not send email if user is not found', async () => {
    mockSubscriptionRepo.findUserById.mockResolvedValue(null)
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    const event = new SubscriptionUpgradedEvent('user-999', 'stripe')
    await listener.handle(event)

    expect(mockEmailService.send).not.toHaveBeenCalled()
  })
})
