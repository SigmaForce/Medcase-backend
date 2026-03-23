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

import { StreakReminderCron } from './streak-reminder.cron'

const mockStreakRepo = {
  findAtRiskToday: jest.fn(),
}

const mockEmailService = {
  send: jest.fn(),
}

describe('StreakReminderCron', () => {
  let cron: StreakReminderCron

  beforeEach(() => {
    jest.clearAllMocks()
    cron = new StreakReminderCron(mockStreakRepo as never, mockEmailService as never)
  })

  it('should send streak-reminder email to each at-risk user', async () => {
    const atRiskUsers = [
      { email: 'user1@test.com', fullName: 'Alice Souza', currentStreak: 5 },
      { email: 'user2@test.com', fullName: 'Bob Lima', currentStreak: 3 },
    ]
    mockStreakRepo.findAtRiskToday.mockResolvedValue(atRiskUsers)
    mockEmailService.send.mockResolvedValue(undefined)

    await cron.sendStreakReminders()

    expect(mockEmailService.send).toHaveBeenCalledTimes(2)
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user1@test.com',
        template: 'streak-reminder',
        data: expect.objectContaining({ first_name: 'Alice', streak_days: 5 }),
      }),
    )
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user2@test.com',
        template: 'streak-reminder',
        data: expect.objectContaining({ first_name: 'Bob', streak_days: 3 }),
      }),
    )
  })

  it('should not send any emails when there are no at-risk users', async () => {
    mockStreakRepo.findAtRiskToday.mockResolvedValue([])

    await cron.sendStreakReminders()

    expect(mockEmailService.send).not.toHaveBeenCalled()
  })
})
