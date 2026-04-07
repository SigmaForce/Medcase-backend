import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { env } from '../../../../config/env'

export type EmailTemplate =
  | 'welcome'
  | 'limit-reached'
  | 'upgrade-confirmed'
  | 'payment-failed'
  | 'downgraded'
  | 'streak-reminder'
  | 'case-rejected'
  | 'cost-alert'

export interface SendNotificationParams {
  to: string
  template: EmailTemplate
  data: Record<string, unknown>
}

@Injectable()
export class NotificationEmailService {
  private readonly resend = new Resend(env.RESEND_API_KEY)

  async send(params: SendNotificationParams): Promise<void> {
    const { subject, html } = this.render(params.template, params.data)
    await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: params.to,
      subject,
      html,
    })
  }

  private render(template: EmailTemplate, data: Record<string, unknown>): { subject: string; html: string } {
    switch (template) {
      case 'welcome':
        return {
          subject: 'Sua conta está pronta — MedCase',
          html: `<h1>Bem-vindo ao MedCase, ${data.first_name}!</h1>
<p>Sua conta está pronta. Você tem <strong>${data.cases_limit} casos</strong> gratuitos por mês.</p>
<p>Bons estudos!</p>`,
        }
      case 'limit-reached':
        return {
          subject: 'Você usou seus 5 casos deste mês — MedCase',
          html: `<h1>Olá, ${data.first_name}!</h1>
<p>Você atingiu o limite de casos gratuitos deste mês.</p>
<p>Seu limite será renovado em <strong>${data.reset_date}</strong>.</p>
<p>Faça upgrade para o plano Pro e pratique sem limites!</p>`,
        }
      case 'upgrade-confirmed':
        return {
          subject: 'Bem-vindo ao Pro! — MedCase',
          html: `<h1>Parabéns, ${data.first_name}!</h1>
<p>Seu plano Pro está ativo. Próxima cobrança: <strong>${data.next_billing_date}</strong>.</p>
<p>Valor: <strong>${data.price}</strong></p>
<p>Bons estudos!</p>`,
        }
      case 'payment-failed':
        return {
          subject: 'Problema com seu pagamento — MedCase',
          html: `<h1>Olá, ${data.first_name},</h1>
<p>Tivemos um problema ao processar seu pagamento.</p>
<p>Tentaremos novamente em <strong>${data.retry_date}</strong>.</p>
<p><a href="${data.portal_url}">Atualizar forma de pagamento</a></p>`,
        }
      case 'downgraded':
        return {
          subject: 'Seu plano voltou para o Free — MedCase',
          html: `<h1>Olá, ${data.first_name},</h1>
<p>Seu plano foi revertido para o Free.</p>
<p>Você ainda tem acesso ao seu histórico completo.</p>
<p>Quando quiser voltar ao Pro, estamos aqui!</p>`,
        }
      case 'streak-reminder':
        return {
          subject: `Seu streak de ${data.streak_days} dias está em risco ⚡ — MedCase`,
          html: `<h1>Atenção, ${data.first_name}!</h1>
<p>Você está com um streak de <strong>${data.streak_days} dias</strong> e ainda não estudou hoje.</p>
<p>Faça uma sessão agora para manter seu streak!</p>`,
        }
      case 'case-rejected':
        return {
          subject: 'Seu caso foi removido da biblioteca — MedCase',
          html: `<h1>Olá, ${data.first_name},</h1>
<p>O caso <strong>"${data.case_title}"</strong> foi removido da biblioteca pública.</p>
<p>Motivo: ${data.rejection_reason}</p>`,
        }
      case 'cost-alert':
        return {
          subject: `⚠️ Custo GPT acima da meta — $${data.cost_per_session}/sessão`,
          html: `<h1>Alerta de custo</h1>
<p>Custo por sessão ontem: <strong>$${data.cost_per_session}</strong></p>
<p>Total gasto: <strong>$${data.total_usd}</strong></p>`,
        }
    }
  }
}
