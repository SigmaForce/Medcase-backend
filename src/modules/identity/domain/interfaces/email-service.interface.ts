export interface SendEmailConfirmationParams {
  to: string
  token: string
  fullName: string
}

export interface SendPasswordResetParams {
  to: string
  token: string
  fullName: string
}

export interface SendPasswordChangedParams {
  to: string
  fullName: string
}

export interface IEmailService {
  sendEmailConfirmation(params: SendEmailConfirmationParams): Promise<void>
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>
  sendPasswordChanged(params: SendPasswordChangedParams): Promise<void>
}
