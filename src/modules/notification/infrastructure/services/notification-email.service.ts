import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { env } from '../../../../config/env'
import { buildEmailHtml } from '../../../../infra/email/base-email-template'

export type EmailTemplate =
  | 'welcome'
  | 'limit-reached'
  | 'upgrade-confirmed'
  | 'payment-failed'
  | 'cancellation-scheduled'
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
const BOX_P = 'margin:0;font-size:14px;color:#1A2B25;line-height:1.8;'
const CHECK = 'color:#08885D;font-weight:600;margin-right:8px;'

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
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">
            Estamos felizes em ter voc&ecirc; no MedCase. Sua conta foi ativada com sucesso
            e voc&ecirc; j&aacute; pode come&ccedil;ar a praticar casos cl&iacute;nicos com IA.
          </p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1A2B25;line-height:1.5;">Voc&ecirc; tem <strong>${data.cases_limit} casos gratuitos</strong> por m&ecirc;s. Inclui:</p>
              <p style="${BOX_P}">
                <span style="${CHECK}">&check;</span>Casos cl&iacute;nicos reais e atualizados<br>
                <span style="${CHECK}">&check;</span>Simula&ccedil;&otilde;es para Revalida<br>
                <span style="${CHECK}">&check;</span>Feedback detalhado do seu racioc&iacute;nio<br>
                <span style="${CHECK}">&check;</span>Renova&ccedil;&atilde;o autom&aacute;tica todo m&ecirc;s
              </p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_DARK}">Come&ccedil;ar agora &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Bons estudos! Qualquer d&uacute;vida, estamos aqui.
          </p>
        `
        return {
          subject: 'Sua conta está pronta — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'BEM-VINDO À MEDCASE',
              title: 'Sua conta está pronta!',
              subtitle: 'Você já pode começar a praticar casos clínicos com IA.',
            },
          }),
        }
      }

      case 'limit-reached': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">Voc&ecirc; utilizou todos os seus casos gratuitos deste m&ecirc;s. Continue praticando
            fazendo upgrade para o plano Pro.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_AMBER}">
              <p style="${BOX_P}">Seu limite gratuito ser&aacute; renovado em <strong>${data.reset_date}</strong>.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_DARK}">Conhecer o plano Pro &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Com o Pro voc&ecirc; tem acesso ilimitado a todos os casos cl&iacute;nicos.
          </p>
        `
        return {
          subject: 'Você usou seus casos deste mês — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'LIMITE MENSAL',
              title: 'Limite de casos atingido',
              subtitle: 'Você utilizou todos os seus casos gratuitos deste mês.',
            },
          }),
        }
      }

      case 'upgrade-confirmed': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">Seu plano Pro est&aacute; ativo. Agora voc&ecirc; tem acesso
            ilimitado a todos os casos cl&iacute;nicos.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1A2B25;line-height:1.5;">Seu plano inclui:</p>
              <p style="${BOX_P}">
                <span style="${CHECK}">&check;</span>Acesso ilimitado a casos cl&iacute;nicos<br>
                <span style="${CHECK}">&check;</span>Pr&oacute;xima cobran&ccedil;a: <strong>${data.next_billing_date}</strong><br>
                <span style="${CHECK}">&check;</span>Valor: <strong>${data.price}</strong><br>
                <span style="${CHECK}">&check;</span>Renova&ccedil;&atilde;o autom&aacute;tica mensal
              </p>
            </td></tr>
          </table>

          <p style="${P}">Sua jornada de treinamento cl&iacute;nico com IA come&ccedil;a agora. Bons estudos!</p>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_DARK}">Come&ccedil;ar a estudar &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Para gerenciar ou cancelar sua assinatura, acesse as configura&ccedil;&otilde;es da sua conta.
          </p>
        `
        return {
          subject: 'Bem-vindo ao Pro! — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'PLANO PRO',
              title: 'Assinatura PRO ativada',
              subtitle: 'Parabéns! Você agora tem acesso ilimitado a todos os casos clínicos.',
            },
          }),
        }
      }

      case 'payment-failed': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">N&atilde;o conseguimos processar seu pagamento. Isso pode acontecer pelos seguintes motivos:</p>

          <p style="margin:0 0 20px;font-size:14px;color:#1A2B25;line-height:1.9;padding-left:4px;">
            &bull; Cart&atilde;o expirado ou dados desatualizados<br>
            &bull; Saldo ou limite insuficiente<br>
            &bull; Bloqueio preventivo do banco
          </p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_RED}">
              <p style="${BOX_P}">Seu acesso ao plano Pro pode ser suspenso em breve. Atualize sua forma de pagamento para continuar.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#DC2626;border-radius:8px;">
                <a href="${data.portal_url}" style="${BTN_RED}">Atualizar pagamento &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Ap&oacute;s atualizar, tentaremos processar novamente automaticamente em <strong>${data.retry_date}</strong>.
          </p>
        `
        return {
          subject: 'Problema com seu pagamento — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'ATENÇÃO',
              title: 'Problema no pagamento',
              subtitle: 'Não conseguimos processar seu pagamento recente.',
            },
          }),
        }
      }

      case 'cancellation-scheduled': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">Confirmamos o cancelamento da sua assinatura Pro. Voc&ecirc; ainda tem acesso completo a todos os recursos at&eacute; o fim do per&iacute;odo pago.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_AMBER}">
              <p style="${BOX_P}">Seu acesso Pro expira em <strong>${data.cancel_at}</strong>. At&eacute; l&aacute;, nada muda.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_DARK}">Gerenciar assinatura &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Mudou de ideia? Voc&ecirc; pode reativar sua assinatura a qualquer momento antes dessa data.
          </p>
        `
        return {
          subject: 'Cancelamento confirmado — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'ASSINATURA',
              title: 'Cancelamento confirmado',
              subtitle: 'Seu acesso Pro continua ativo até o fim do período pago.',
            },
          }),
        }
      }

      case 'downgraded': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">Confirmamos o cancelamento da sua assinatura Pro.
            Voc&ecirc; retornou ao plano gratuito.</p>
          <p style="${P}">Voc&ecirc; ainda tem acesso ao seu hist&oacute;rico completo de casos e pode continuar
            utilizando os casos gratuitos mensais.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="${BOX_P}">Quer continuar praticando sem limites? Voc&ecirc; pode reativar sua assinatura a qualquer momento.</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${env.APP_URL}" style="${BTN_DARK}">Reativar assinatura &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Tem algum feedback?
            <a href="mailto:suporte@medcase.com" style="color:#08885D;text-decoration:underline;">Conte para a gente</a>
            &mdash; sua opini&atilde;o nos ajuda a melhorar.
          </p>
        `
        return {
          subject: 'Seu plano voltou para o Free — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'ASSINATURA',
              title: 'Assinatura cancelada',
              subtitle: 'Seu plano Pro foi cancelado. Você retornou ao plano gratuito.',
            },
          }),
        }
      }

      case 'streak-reminder': {
        const remaining = data.remaining_cases as number
        const plural = remaining !== 1
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name}!</p>
          <p style="${P}">Voc&ecirc; ainda tem <strong>${remaining} caso${plural ? 's' : ''}</strong>
            dispon&iacute;ve${plural ? 'is' : 'l'} este m&ecirc;s. Aproveite para praticar e evoluir no seu racioc&iacute;nio cl&iacute;nico.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_GREEN}">
              <p style="${BOX_P}">Seus casos gratuitos <strong>renovam todo m&ecirc;s</strong>. N&atilde;o deixe passar!</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="background-color:#1A2B25;border-radius:8px;">
                <a href="${data.app_link}" style="${BTN_DARK}">Resolver um caso agora &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.6;">
            <a href="${data.app_link}" style="color:#08885D;text-decoration:underline;">${data.app_link}</a>
          </p>
        `
        return {
          subject: 'Você ainda tem casos disponíveis este mês — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'LEMBRETE',
              title: 'Casos disponíveis este mês',
              subtitle: 'Não deixe seus casos gratuitos passarem sem uso.',
            },
          }),
        }
      }

      case 'case-rejected': {
        const content = `
          <p style="${PMUTED}">Ol&aacute;, ${data.first_name},</p>
          <p style="${P}">O caso <strong>&ldquo;${data.case_title}&rdquo;</strong> foi removido da biblioteca p&uacute;blica ap&oacute;s revis&atilde;o.</p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            <tr><td style="${BOX_AMBER}">
              <p style="${BOX_P}"><strong>Motivo:</strong> ${data.rejection_reason}</p>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
            Voc&ecirc; pode editar o caso e submet&ecirc;-lo novamente para revis&atilde;o.
          </p>
        `
        return {
          subject: 'Seu caso foi removido da biblioteca — MedCase',
          html: buildEmailHtml({
            content,
            hero: {
              label: 'CURADORIA',
              title: 'Caso removido da biblioteca',
              subtitle: 'O caso foi removido da biblioteca após revisão editorial.',
            },
          }),
        }
      }

      case 'cost-alert':
        return {
          subject: `Custo GPT acima da meta — $${data.cost_per_session}/sessão`,
          html: buildEmailHtml({
            content: `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
                <tr><td style="${BOX_RED}">
                  <p style="${BOX_P}">
                    Custo por sess&atilde;o ontem: <strong>$${data.cost_per_session}</strong><br>
                    Total gasto: <strong>$${data.total_usd}</strong>
                  </p>
                </td></tr>
              </table>
              <p style="margin:0;font-size:13px;color:#587A6F;line-height:1.6;">
                Verifique o uso de tokens no painel de an&aacute;lise.
              </p>
            `,
            hero: {
              label: 'MONITORAMENTO',
              title: 'Alerta de custo',
              subtitle: 'Custo GPT acima da meta definida.',
            },
          }),
        }
    }
  }
}
