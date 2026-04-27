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
const BTN_DARK = `${BTN}background-color:#1A2B25;color:#FFFFFF;`
const BTN_RED = `${BTN}background-color:#DC2626;color:#FFFFFF;`

const P = 'margin:0 0 16px;font-size:15px;color:#1A2B25;line-height:1.7;'
const PMUTED = 'margin:0 0 16px;font-size:13px;color:#587A6F;line-height:1.7;'
const BOX_AMBER =
  'background-color:#FFFBEB;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_GREEN =
  'background-color:#EDF7F2;border-left:4px solid #08885D;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_RED =
  'background-color:#FEF2F2;border-left:4px solid #DC2626;border-radius:0 6px 6px 0;padding:14px 18px;'
const BOX_P = 'margin:0;font-size:14px;color:#1A2B25;line-height:1.6;'
const CHECK = 'color:#08885D;font-weight:600;margin-right:8px;'

@Injectable()
export class ResendEmailService implements IEmailService {
  private readonly resend = new Resend(env.RESEND_API_KEY)

  async sendEmailConfirmation(params: SendEmailConfirmationParams): Promise<void> {
    const confirmUrl = `${env.APP_URL}/auth/confirm-email?token=${params.token}`

    const content = `
      <p style="${PMUTED}">Ol&aacute;, ${params.fullName}!</p>
      <p style="${P}">
        Seu acesso est&aacute; quase pronto.
        Clique abaixo para confirmar seu e-mail e liberar sua conta.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
        <tr>
          <td style="background-color:#1A2B25;border-radius:8px;">
            <a href="${confirmUrl}" style="${BTN_DARK}">Confirmar meu e-mail &rarr;</a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr><td style="${BOX_GREEN}">
          <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1A2B25;line-height:1.5;">Ao ativar sua conta voc&ecirc; ter&aacute; acesso a:</p>
          <p style="${BOX_P}">
            <span style="${CHECK}">&check;</span>Casos cl&iacute;nicos reais e atualizados<br>
            <span style="${CHECK}">&check;</span>Simula&ccedil;&otilde;es para Revalida<br>
            <span style="${CHECK}">&check;</span>Treino orientado para aprova&ccedil;&atilde;o
          </p>
        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr><td style="${BOX_AMBER}">
          <p style="${BOX_P}">Este link expira em <strong>24 horas</strong> e s&oacute; pode ser utilizado uma vez.</p>
        </td></tr>
      </table>

      <p style="${PMUTED}">
        Se voc&ecirc; n&atilde;o criou uma conta no MedCase, pode ignorar este e-mail com seguran&ccedil;a.
      </p>
      <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
        Bot&atilde;o n&atilde;o funcionou? Copie o link abaixo:<br>
        <a href="${confirmUrl}" style="color:#08885D;text-decoration:underline;word-break:break-all;">${confirmUrl}</a>
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Confirme seu e-mail — MedCase',
      html: buildEmailHtml({
        content,
        hero: {
          label: 'BEM-VINDO À MEDCASE',
          title: 'Confirme seu e-mail',
          subtitle:
            'Ative sua conta e comece a praticar com casos clínicos reais para conquistar sua aprovação.',
        },
      }),
    })
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${params.token}`

    const content = `
      <p style="${PMUTED}">Ol&aacute;, ${params.fullName}!</p>
      <p style="${P}">
        Clique no bot&atilde;o abaixo para criar uma nova senha.
        Se voc&ecirc; n&atilde;o fez essa solicita&ccedil;&atilde;o, ignore este e-mail — sua senha permanece a mesma.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
        <tr>
          <td style="background-color:#1A2B25;border-radius:8px;">
            <a href="${resetUrl}" style="${BTN_DARK}">Redefinir senha &rarr;</a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr><td style="${BOX_AMBER}">
          <p style="${BOX_P}">Este link &eacute; v&aacute;lido por <strong>1 hora</strong> e s&oacute; pode ser utilizado uma vez.</p>
        </td></tr>
      </table>

      <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
        Bot&atilde;o n&atilde;o funcionou? Copie o link abaixo:<br>
        <a href="${resetUrl}" style="color:#08885D;text-decoration:underline;word-break:break-all;">${resetUrl}</a>
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Redefinição de senha — MedCase',
      html: buildEmailHtml({
        content,
        hero: {
          label: 'SEGURANÇA DA CONTA',
          title: 'Redefinir sua senha',
          subtitle: 'Recebemos uma solicitação para redefinir a senha da sua conta MedCase.',
        },
      }),
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
      <p style="${PMUTED}">Ol&aacute;, ${params.fullName}!</p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">
        <tr><td style="${BOX_GREEN}">
          <p style="${BOX_P}"><strong>Foi voc&ecirc;?</strong> Nenhuma a&ccedil;&atilde;o &eacute; necess&aacute;ria. Sua conta est&aacute; segura.</p>
        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;">
        <tr><td style="${BOX_RED}">
          <p style="${BOX_P}"><strong>N&atilde;o foi voc&ecirc;?</strong> Redefina sua senha imediatamente para proteger sua conta.</p>
        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background-color:#DC2626;border-radius:8px;">
            <a href="${forgotUrl}" style="${BTN_RED}">Proteger minha conta &rarr;</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
        Mantenha sua senha segura: n&atilde;o a compartilhe com ningu&eacute;m e evite reutiliz&aacute;-la em outros servi&ccedil;os.
      </p>
    `

    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject: 'Sua senha foi alterada — MedCase',
      html: buildEmailHtml({
        content,
        hero: {
          label: 'SEGURANÇA DA CONTA',
          title: 'Sua senha foi alterada',
          subtitle: `Alteração realizada em ${now}.`,
        },
      }),
    })
  }
}
