jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
  },
}))

import { UsageLimitReachedListener } from './usage-limit-reached.listener'
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

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => {
  const sub = Subscription.createFree('user-1')
  return Object.assign(sub, overrides)
}

describe('UsageLimitReachedListener', () => {
  let listener: UsageLimitReachedListener
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let emailService: jest.Mocked<NotificationEmailService>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    emailService = makeEmailService()
    listener = new UsageLimitReachedListener(subscriptionRepo, emailService)
  })

  it('should send limit-reached email with reset date from subscription', async () => {
    const resetAt = new Date('2026-04-01T00:00:00.000Z')
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(makeSubscription({ usageResetAt: resetAt }))

    await listener.handle({ userId: 'user-1' })

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'joao@example.com',
      template: 'limit-reached',
      data: {
        first_name: 'João',
        reset_date: resetAt.toLocaleDateString('pt-BR'),
      },
    })
  })

  it('should send limit-reached email with empty reset_date when subscription is null', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(null)

    await listener.handle({ userId: 'user-1' })

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reset_date: '' }),
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
      email: 'lucia@example.com',
      fullName: 'Lucia Fernanda Ramos',
      country: 'BR',
    })
    subscriptionRepo.findByUserId.mockResolvedValue(null)

    await listener.handle({ userId: 'user-2' })

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Lucia' }),
      }),
    )
  })
})
