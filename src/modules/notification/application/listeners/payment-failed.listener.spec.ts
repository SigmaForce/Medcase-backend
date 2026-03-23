jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
    APP_URL: 'https://app.revalidai.com',
  },
}))

import { PaymentFailedListener } from './payment-failed.listener'
import { PaymentFailedEvent } from '../../../subscription/domain/events/payment-failed.event'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'

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
  }) as jest.Mocked<ISubscriptionRepository>

const makeEmailService = (): jest.Mocked<NotificationEmailService> =>
  ({ send: jest.fn() }) as never

describe('PaymentFailedListener', () => {
  let listener: PaymentFailedListener
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let emailService: jest.Mocked<NotificationEmailService>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    emailService = makeEmailService()
    listener = new PaymentFailedListener(subscriptionRepo, emailService)
  })

  it('should send payment-failed email with correct template and data', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })

    const event = new PaymentFailedEvent('user-1', 'stripe')
    await listener.handle(event)

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'joao@example.com',
        template: 'payment-failed',
        data: expect.objectContaining({
          first_name: 'João',
          retry_date: expect.any(String),
          portal_url: 'https://app.revalidai.com/billing',
        }),
      }),
    )
  })

  it('should return early when user is not found', async () => {
    subscriptionRepo.findUserById.mockResolvedValue(null)

    const event = new PaymentFailedEvent('user-1', 'stripe')
    await listener.handle(event)

    expect(emailService.send).not.toHaveBeenCalled()
  })

  it('should use only the first name from fullName', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'ana@example.com',
      fullName: 'Ana Carolina Lima',
      country: 'BR',
    })

    const event = new PaymentFailedEvent('user-2', 'stripe')
    await listener.handle(event)

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Ana' }),
      }),
    )
  })
})
