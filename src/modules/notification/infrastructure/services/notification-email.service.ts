import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { env } from '../../../../config/env'
import { buildEmailHtml } from '../../../../infra/email/base-email-template'

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

const BTN =
  "display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
const BTN_GREEN = `${BTN}background-color:#08885D;color:#F0FDF9;`
const BTN_RED = `${BTN}background-color:#DC2626;color:#FFFFFF;`

const H1 = 'margin:0 0 8px;font-size:24px;font-weight:700;color:#1A2B25;line-height:1.3;'
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

  private render(
    template: EmailTemplate,
    data: Record<string, unknown>,
  ): { subject: string; html: string } {
    switch (template) {
      case 'welcome': {
        const content = `
          <h1 style="${H1}">Sua conta está pronta, ${data.first_name}!</h1>
          <p style="${P}">
            Estamos felizes em ter você no MedCase. Sua conta foi ativada com sucesso
            e você já pode começar a praticar casos clínicos com IA.
          </p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="${BOX_P}">🎯 Você tem <strong>${data.cases_limit} casos gratuitos</strong> disponíveis por mês. Seus casos renovam automaticamente todo mês.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#08885D;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_GREEN}">Começar agora</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Bons estudos! Qualquer dúvida, estamos aqui.
          </p>
        `
        return {
          subject: 'Sua conta está pronta — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'limit-reached': {
        const content = `
          <h1 style="${H1}">Limite de casos atingido</h1>
          <p style="${P}">Olá, ${data.first_name}!</p>
          <p style="${P}">Você utilizou todos os seus casos gratuitos deste mês. Continue praticando
            fazendo upgrade para o plano Pro.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_AMBER}">
              <p style="${BOX_P}">📅 Seu limite gratuito será renovado em <strong>${data.reset_date}</strong>.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#08885D;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_GREEN}">Conhecer o plano Pro</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Com o Pro você tem acesso ilimitado a todos os casos clínicos.
          </p>
        `
        return {
          subject: 'Você usou seus 5 casos deste mês — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'upgrade-confirmed': {
        const content = `
          <h1 style="${H1}">Assinatura PRO ativada</h1>
          <p style="${P}">Parabéns, ${data.first_name}! Seu plano Pro está ativo. Agora você tem acesso
            ilimitado a todos os casos clínicos.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1A2B25;line-height:1.5;">Seu plano inclui:</p>
              <p style="${BOX_P}">
                ✅ Acesso ilimitado a casos clínicos<br>
                📅 Próxima cobrança: <strong>${data.next_billing_date}</strong><br>
                💳 Valor: <strong>${data.price}</strong><br>
                🔄 Renovação automática mensal
              </p>
            </td></tr>
          </table>

          <p style="${P}">Sua jornada de treinamento clínico com IA começa agora. Bons estudos!</p>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#08885D;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_GREEN}">Começar a estudar</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Para gerenciar ou cancelar sua assinatura, acesse as configurações da sua conta.
          </p>
        `
        return {
          subject: 'Bem-vindo ao Pro! — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'payment-failed': {
        const content = `
          <h1 style="${H1}">Problema no pagamento</h1>
          <p style="${P}">Olá, ${data.first_name}, não conseguimos processar seu pagamento.
            Isso pode acontecer por alguns motivos:</p>

          <p style="margin:0 0 20px;font-size:14px;color:#1A2B25;line-height:1.9;padding-left:4px;">
            &bull; Cartão expirado ou dados desatualizados<br>
            &bull; Saldo ou limite insuficiente<br>
            &bull; Bloqueio preventivo do banco
          </p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_RED}">
              <p style="${BOX_P}">⚠️ Seu acesso ao plano Pro pode ser suspenso em breve. Atualize sua forma de pagamento para continuar.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#DC2626;border-radius:8px;">
                <a href="${data.portal_url}" style="${BTN_RED}">Atualizar pagamento</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Após atualizar, tentaremos processar novamente automaticamente em <strong>${data.retry_date}</strong>.
          </p>
        `
        return {
          subject: 'Problema com seu pagamento — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'downgraded': {
        const content = `
          <h1 style="${H1}">Sua assinatura foi cancelada</h1>
          <p style="${P}">Olá, ${data.first_name}, confirmamos o cancelamento da sua assinatura Pro.
            Você retornou ao plano gratuito.</p>
          <p style="${P}">Você ainda tem acesso ao seu histórico completo de casos e pode continuar
            utilizando os casos gratuitos mensais.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="${BOX_P}">💡 Quer continuar praticando sem limites? Você pode reativar sua assinatura a qualquer momento.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#08885D;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_GREEN}">Reativar assinatura</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Tem algum feedback?
            <a href="mailto:suporte@medcase.com" style="color:#08885D;text-decoration:underline;">Conte para a gente</a>
            — sua opinião nos ajuda a melhorar.
          </p>
        `
        return {
          subject: 'Seu plano voltou para o Free — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'streak-reminder': {
        const remaining = data.remaining_cases as number
        const plural = remaining !== 1
        const content = `
          <h1 style="${H1}">Você ainda tem casos disponíveis</h1>
          <p style="${P}">Olá, ${data.first_name}! Você ainda tem <strong>${remaining} caso${plural ? 's' : ''}</strong>
            disponíve${plural ? 'is' : 'l'} este mês. Aproveite para praticar e evoluir no seu raciocínio clínico.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="${BOX_P}">📅 Seus casos gratuitos <strong>renovam todo mês</strong>. Não deixe passar!</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#08885D;border-radius:8px;">
                <a href="${data.app_link}" style="${BTN_GREEN}">Resolver um caso agora</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
            <a href="${data.app_link}" style="color:#08885D;text-decoration:underline;">${data.app_link}</a>
          </p>
        `
        return {
          subject: 'Você ainda tem casos disponíveis este mês — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'case-rejected': {
        const content = `
          <h1 style="${H1}">Caso removido da biblioteca</h1>
          <p style="${P}">Olá, ${data.first_name},</p>
          <p style="${P}">O caso <strong>"${data.case_title}"</strong> foi removido da biblioteca pública após revisão.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_AMBER}">
              <p style="${BOX_P}"><strong>Motivo:</strong> ${data.rejection_reason}</p>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Você pode editar o caso e submetê-lo novamente para revisão.
          </p>
        `
        return {
          subject: 'Seu caso foi removido da biblioteca — MedCase',
          html: buildEmailHtml(content),
        }
      }

      case 'cost-alert':
        return {
          subject: `⚠️ Custo GPT acima da meta — $${data.cost_per_session}/sessão`,
          html: buildEmailHtml(`
            <h1 style="${H1}">Alerta de custo</h1>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
              <tr><td style="${BOX_RED}">
                <p style="${BOX_P}">
                  Custo por sessão ontem: <strong>$${data.cost_per_session}</strong><br>
                  Total gasto: <strong>$${data.total_usd}</strong>
                </p>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
              Verifique o uso de tokens no painel de análise.
            </p>
          `),
        }
    }
  }
}
