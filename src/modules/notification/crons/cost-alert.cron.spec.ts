const mockAdminEmail = 'admin@revalidai.com'

jest.mock('../../../config/env', () => ({
  env: {
    ADMIN_EMAIL: mockAdminEmail,
  },
}))

import { CostAlertCron } from './cost-alert.cron'

const mockUsageMetricsRepo = {
  getDailyStats: jest.fn(),
}

const mockEmailService = {
  send: jest.fn(),
}

describe('CostAlertCron', () => {
  let cron: CostAlertCron

  beforeEach(() => {
    jest.clearAllMocks()
    cron = new CostAlertCron(mockUsageMetricsRepo as never, mockEmailService as never)
  })

  it('should send cost-alert email to ADMIN_EMAIL when costPerSession exceeds $0.10', async () => {
    mockUsageMetricsRepo.getDailyStats.mockResolvedValue({
      sessions: 100,
      costPerSession: 0.15,
      estimatedUsd: 15.0,
    })
    mockEmailService.send.mockResolvedValue(undefined)

    await cron.checkDailyCosts()

    expect(mockEmailService.send).toHaveBeenCalledTimes(1)
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockAdminEmail,
        template: 'cost-alert',
        data: expect.objectContaining({
          cost_per_session: '0.150',
          total_usd: '15.00',
        }),
      }),
    )
  })

  it('should not send email when costPerSession is exactly $0.10', async () => {
    mockUsageMetricsRepo.getDailyStats.mockResolvedValue({
      sessions: 50,
      costPerSession: 0.10,
      estimatedUsd: 5.0,
    })

    await cron.checkDailyCosts()

    expect(mockEmailService.send).not.toHaveBeenCalled()
  })

  it('should not send email when costPerSession is below $0.10', async () => {
    mockUsageMetricsRepo.getDailyStats.mockResolvedValue({
      sessions: 50,
      costPerSession: 0.05,
      estimatedUsd: 2.5,
    })

    await cron.checkDailyCosts()

    expect(mockEmailService.send).not.toHaveBeenCalled()
  })

  it('should not send email when sessions count is 0', async () => {
    mockUsageMetricsRepo.getDailyStats.mockResolvedValue({
      sessions: 0,
      costPerSession: 0.5,
      estimatedUsd: 0,
    })

    await cron.checkDailyCosts()

    expect(mockEmailService.send).not.toHaveBeenCalled()
  })
})
