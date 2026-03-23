jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
  },
}))

import { UserEmailConfirmedListener } from './user-email-confirmed.listener'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { Subscription } from '../../../subscription/domain/entities/subscription.entity'

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

describe('UserEmailConfirmedListener', () => {
  let listener: UserEmailConfirmedListener
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let emailService: jest.Mocked<NotificationEmailService>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    emailService = makeEmailService()
    listener = new UserEmailConfirmedListener(subscriptionRepo, emailService)
  })

  it('should send welcome email with casesLimit from subscription', async () => {
    const sub = Subscription.createFree('user-1')
    sub.casesLimit = 10

    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(sub)

    await listener.handle({ userId: 'user-1' })

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'joao@example.com',
      template: 'welcome',
      data: {
        first_name: 'João',
        cases_limit: 10,
      },
    })
  })

  it('should fallback to 5 cases_limit when subscription is null', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(null)

    await listener.handle({ userId: 'user-1' })

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cases_limit: 5 }),
      }),
    )
  })

  it('should return early when user is not found', async () => {
    subscriptionRepo.findUserById.mockResolvedValue(null)
    subscriptionRepo.findByUserId.mockResolvedValue(null)

    await listener.handle({ userId: 'user-1' })

    expect(emailService.send).not.toHaveBeenCalled()
  })

  it('should use only the first name from fullName', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'carla@example.com',
      fullName: 'Carla Beatriz Nunes',
      country: 'PY',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(null)

    await listener.handle({ userId: 'user-2' })

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Carla' }),
      }),
    )
  })
})
