jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
  },
}))

import { SubscriptionDowngradedListener } from './subscription-downgraded.listener'
import { SubscriptionDowngradedEvent } from '../../../subscription/domain/events/subscription-downgraded.event'
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
    findDueForReset: jest.fn(),
  }) as jest.Mocked<ISubscriptionRepository>

const makeEmailService = (): jest.Mocked<NotificationEmailService> =>
  ({ send: jest.fn() }) as never

describe('SubscriptionDowngradedListener', () => {
  let listener: SubscriptionDowngradedListener
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let emailService: jest.Mocked<NotificationEmailService>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    emailService = makeEmailService()
    listener = new SubscriptionDowngradedListener(subscriptionRepo, emailService)
  })

  it('should send downgraded email with correct template and data', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })

    const event = new SubscriptionDowngradedEvent('user-1', 'stripe')
    await listener.handle(event)

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'joao@example.com',
      template: 'downgraded',
      data: { first_name: 'João' },
    })
  })

  it('should return early when user is not found', async () => {
    subscriptionRepo.findUserById.mockResolvedValue(null)

    const event = new SubscriptionDowngradedEvent('user-1', 'stripe')
    await listener.handle(event)

    expect(emailService.send).not.toHaveBeenCalled()
  })

  it('should use only the first name from fullName', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'pedro@example.com',
      fullName: 'Pedro Henrique Alves',
      country: 'BR',
    })

    const event = new SubscriptionDowngradedEvent('user-2', 'mercadopago')
    await listener.handle(event)

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Pedro' }),
      }),
    )
  })
})
