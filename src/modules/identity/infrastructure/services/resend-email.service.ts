import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { env } from '../../../../config/env'
import { buildEmailHtml } from '../../../../infra/email/base-email-template'
import {
  IEmailService,
  SendEmailConfirmationParams,
  SendPasswordChangedParams,
  SendPasswordResetParams,
} from '../../domain/interfaces/email-service.interface'

const BTN =
  'display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
const BTN_GREEN = `${BTN}background-color:#08885D;color:#F0FDF9;`
const BTN_RED = `${BTN}background-color:#DC2626;color:#FFFFFF;`

const H1 =
  'margin:0 0 8px;font-size:24px;font-weight:700;color:#1A2B25;line-height:1.3;'
const P = 'margin:0 0 16px;font-size:15px;color:#1A2B25;line-height:1.7;'
const PMUTED = 'margin:0 0 16px;font-size:13px;color:#587A6F;line-height:1.7;'
const BOX_AMBER =
  'background-color:#FFFBEB;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_GREEN =
  'background-color:#EDF7F2;border-left:4px solid #08885D;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_RED =
  'background-color:#FEF2F2;border-left:4px solid #DC2626;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_P = 'margin:0;font-size:14px;color:#1A2B25;line-height:1.6;'

@Injectable()
export class ResendEmailService implements IEmailService {
  private readonly resend = new Resend(env.RESEND_API_KEY)

  async sendEmailConfirmation(params: SendEmailConfirmationParams): Promise<void> {
    const confirmUrl = `${env.APP_URL}/auth/confirm-email?token=${params.token}`

    const content = `
      <h1 style="${H1}">Confirme seu e-mail</h1>
      <p style="${PMUTED}">Olá, ${params.fullName}!</p>
      <p style="${P}">
        Obrigado por criar sua conta no <strong>MedCase</strong>. Para ativar seu acesso,
        confirme seu endereço de e-mail clicando no botão abaixo.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
        <tr>
          <td style="background-color:#08885D;border-radius:8px;">
            <a href="${confirmUrl}" style="${BTN_GREEN}">Confirmar e-mail</a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr><td style="${BOX_AMBER}">
          <p style="${BOX_P}">⏳ Este link expira em <strong>24 horas</strong> e só pode ser utilizado uma vez.</p>
        </td></tr>
      </table>

      <p style="${PMUTED}">
        Se você não criou uma conta no MedCase, pode ignorar este e-mail com segurança.
      </p>
      <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
        Botão não funcionou? Copie o link abaixo:<br>
        <a href="${confirmUrl}" style="color:#08885D;text-decoration:underline;word-break:break-all;">${confirmUrl}</a>
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Confirme seu e-mail — MedCase',
      html: buildEmailHtml(content),
    })
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${params.token}`

    const content = `
      <h1 style="${H1}">Redefinir sua senha</h1>
      <p style="${PMUTED}">Olá, ${params.fullName}!</p>
      <p style="${P}">
        Recebemos uma solicitação para redefinir a senha da sua conta MedCase.
        Clique no botão abaixo para criar uma nova senha.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
        <tr>
          <td style="background-color:#08885D;border-radius:8px;">
            <a href="${resetUrl}" style="${BTN_GREEN}">Redefinir senha</a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr><td style="${BOX_AMBER}">
          <p style="${BOX_P}">⏳ Este link é válido por <strong>1 hora</strong> e só pode ser utilizado uma vez.</p>
        </td></tr>
      </table>

      <p style="${PMUTED}">
        Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha permanece a mesma.
      </p>
      <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
        Botão não funcionou? Copie o link abaixo:<br>
        <a href="${resetUrl}" style="color:#08885D;text-decoration:underline;word-break:break-all;">${resetUrl}</a>
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Redefinição de senha — MedCase',
      html: buildEmailHtml(content),
    })
  }

  async sendPasswordChanged(params: SendPasswordChangedParams): Promise<void> {
    const forgotUrl = `${env.APP_URL}/auth/forgot-password`
    const now = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const content = `
      <h1 style="${H1}">Sua senha foi alterada</h1>
      <p style="${PMUTED}">Olá, ${params.fullName}!</p>
      <p style="${P}">
        Sua senha foi alterada com sucesso em <strong>${now}</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">
        <tr><td style="${BOX_GREEN}">
          <p style="${BOX_P}">✅ <strong>Foi você?</strong> Nenhuma ação é necessária. Sua conta está segura.</p>
        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;">
        <tr><td style="${BOX_RED}">
          <p style="${BOX_P}">🚨 <strong>Não foi você?</strong> Redefina sua senha imediatamente para proteger sua conta.</p>
        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background-color:#DC2626;border-radius:8px;">
            <a href="${forgotUrl}" style="${BTN_RED}">Proteger minha conta</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
        🔒 Mantenha sua senha segura: não a compartilhe com ninguém e evite reutilizá-la em outros serviços.
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Sua senha foi alterada — MedCase',
      html: buildEmailHtml(content),
    })
  }
}
