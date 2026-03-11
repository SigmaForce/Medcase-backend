import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { env } from '../../../../config/env'
import {
  IEmailService,
  SendEmailConfirmationParams,
  SendPasswordResetParams,
} from '../../domain/interfaces/email-service.interface'

@Injectable()
export class ResendEmailService implements IEmailService {
  private readonly resend = new Resend(env.RESEND_API_KEY)

  async sendEmailConfirmation(params: SendEmailConfirmationParams): Promise<void> {
    const confirmUrl = `${env.APP_URL}/auth/confirm-email?token=${params.token}`

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Confirme seu e-mail — Revalidai',
      html: `
        <h2>Olá, ${params.fullName}!</h2>
        <p>Clique no link abaixo para confirmar seu e-mail:</p>
        <a href="${confirmUrl}">${confirmUrl}</a>
        <p>O link expira em 24 horas.</p>
      `,
    })
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${params.token}`

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Redefinição de senha — Revalidai',
      html: `
        <h2>Olá, ${params.fullName}!</h2>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>O link expira em 1 hora.</p>
      `,
    })
  }
}
