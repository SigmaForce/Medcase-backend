import { ResendEmailService } from './resend-email.service'

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

jest.mock('../../../../config/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'noreply@revalidai.com',
    APP_URL: 'http://localhost:3000',
  },
}))

describe('ResendEmailService', () => {
  let service: ResendEmailService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ResendEmailService()
  })

  describe('sendEmailConfirmation', () => {
    it('should call resend.emails.send with correct params', async () => {
      mockSend.mockResolvedValueOnce({ id: 'email-id-123' })

      await service.sendEmailConfirmation({
        to: 'student@example.com',
        token: 'abc123token',
        fullName: 'João Silva',
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@revalidai.com',
          to: 'student@example.com',
          subject: 'Confirme seu e-mail — Revalidai',
        }),
      )
    })

    it('should include the confirmation URL with the token in the html', async () => {
      mockSend.mockResolvedValueOnce({ id: 'email-id-123' })

      await service.sendEmailConfirmation({
        to: 'student@example.com',
        token: 'my-token-xyz',
        fullName: 'Maria Oliveira',
      })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('http://localhost:3000/auth/confirm-email?token=my-token-xyz')
      expect(html).toContain('Maria Oliveira')
    })

    it('should propagate errors thrown by Resend', async () => {
      mockSend.mockRejectedValueOnce(new Error('Resend API error'))

      await expect(
        service.sendEmailConfirmation({
          to: 'student@example.com',
          token: 'token',
          fullName: 'João',
        }),
      ).rejects.toThrow('Resend API error')
    })
  })

  describe('sendPasswordReset', () => {
    it('should call resend.emails.send with correct params', async () => {
      mockSend.mockResolvedValueOnce({ id: 'email-id-456' })

      await service.sendPasswordReset({
        to: 'student@example.com',
        token: 'reset-token-456',
        fullName: 'Carlos Souza',
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@revalidai.com',
          to: 'student@example.com',
          subject: 'Redefinição de senha — Revalidai',
        }),
      )
    })

    it('should include the reset URL with the token in the html', async () => {
      mockSend.mockResolvedValueOnce({ id: 'email-id-456' })

      await service.sendPasswordReset({
        to: 'student@example.com',
        token: 'reset-xyz',
        fullName: 'Ana Lima',
      })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('http://localhost:3000/auth/reset-password?token=reset-xyz')
      expect(html).toContain('Ana Lima')
    })

    it('should propagate errors thrown by Resend', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(
        service.sendPasswordReset({
          to: 'student@example.com',
          token: 'token',
          fullName: 'Ana',
        }),
      ).rejects.toThrow('Network timeout')
    })
  })
})
