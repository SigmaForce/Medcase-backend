const mockEmailsSend = jest.fn().mockResolvedValue({ id: 'email-id' })

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}))

jest.mock('../../../../config/env', () => ({
  env: {
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_EMAIL: 'noreply@medcase.com',
    APP_URL: 'https://app.medcase.com',
  },
}))

import { NotificationEmailService } from './notification-email.service'

describe('NotificationEmailService', () => {
  let service: NotificationEmailService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new NotificationEmailService()
  })

  it('should call resend.emails.send with correct to and subject for template "welcome"', async () => {
    await service.send({
      to: 'student@test.com',
      template: 'welcome',
      data: { first_name: 'João', cases_limit: 5 },
    })

    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const call = mockEmailsSend.mock.calls[0][0] as { to: string; subject: string; from: string }
    expect(call.to).toBe('student@test.com')
    expect(call.subject).toContain('MedCase')
    expect(call.from).toBe('noreply@medcase.com')
  })

  it('should call resend.emails.send with correct to and subject for template "upgrade-confirmed"', async () => {
    await service.send({
      to: 'pro@test.com',
      template: 'upgrade-confirmed',
      data: { first_name: 'Maria', next_billing_date: '01/01/2027', price: 'R$ 89,00' },
    })

    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const call = mockEmailsSend.mock.calls[0][0] as { to: string; subject: string }
    expect(call.to).toBe('pro@test.com')
    expect(call.subject).toContain('Pro')
  })

  it('should call resend.emails.send with correct to and subject for template "payment-failed"', async () => {
    await service.send({
      to: 'failed@test.com',
      template: 'payment-failed',
      data: { first_name: 'Carlos', retry_date: '15/01/2027', portal_url: 'https://portal.com' },
    })

    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const call = mockEmailsSend.mock.calls[0][0] as { to: string; subject: string }
    expect(call.to).toBe('failed@test.com')
    expect(call.subject).toContain('pagamento')
  })

  it('should call resend.emails.send with correct to and subject for template "streak-reminder"', async () => {
    await service.send({
      to: 'streak@test.com',
      template: 'streak-reminder',
      data: { first_name: 'Ana', remaining_cases: 4, app_link: 'https://app.medcase.com' },
    })

    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const call = mockEmailsSend.mock.calls[0][0] as { to: string; subject: string }
    expect(call.to).toBe('streak@test.com')
    expect(call.subject).toContain('casos disponíveis')
  })

  it('should call resend.emails.send with correct to and subject for template "cost-alert"', async () => {
    await service.send({
      to: 'admin@medcase.com',
      template: 'cost-alert',
      data: { cost_per_session: '0.150', total_usd: '15.00' },
    })

    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const call = mockEmailsSend.mock.calls[0][0] as { to: string; subject: string }
    expect(call.to).toBe('admin@medcase.com')
    expect(call.subject.toLowerCase()).toContain('custo')
  })
})
