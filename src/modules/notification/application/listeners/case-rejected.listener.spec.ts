jest.mock('src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test',
    ADMIN_EMAIL: 'admin@test.com',
    POSTHOG_API_KEY: 'test',
    POSTHOG_HOST: 'https://app.posthog.com',
  },
}))

import { CaseRejectedListener, CaseRejectedPayload } from './case-rejected.listener'
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

const makeEvent = (): CaseRejectedPayload => ({
  userId: 'user-1',
  caseId: 'case-1',
  caseTitle: 'Dor abdominal aguda',
  rejectionReason: 'Conteúdo inadequado',
})

describe('CaseRejectedListener', () => {
  let listener: CaseRejectedListener
  let subscriptionRepo: jest.Mocked<ISubscriptionRepository>
  let emailService: jest.Mocked<NotificationEmailService>

  beforeEach(() => {
    subscriptionRepo = makeSubscriptionRepo()
    emailService = makeEmailService()
    listener = new CaseRejectedListener(subscriptionRepo, emailService)
  })

  it('should send case-rejected email with correct data', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'joao@example.com',
      fullName: 'João Silva',
      country: 'BR',
    })

    await listener.handle(makeEvent())

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'joao@example.com',
      template: 'case-rejected',
      data: {
        first_name: 'João',
        case_title: 'Dor abdominal aguda',
        rejection_reason: 'Conteúdo inadequado',
      },
    })
  })

  it('should return early when user is not found', async () => {
    subscriptionRepo.findUserById.mockResolvedValue(null)

    await listener.handle(makeEvent())

    expect(emailService.send).not.toHaveBeenCalled()
  })

  it('should use only the first name from fullName', async () => {
    subscriptionRepo.findUserById.mockResolvedValue({
      email: 'maria@example.com',
      fullName: 'Maria Eduarda Souza',
      country: 'BR',
    })

    await listener.handle(makeEvent())

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ first_name: 'Maria' }),
      }),
    )
  })
})
