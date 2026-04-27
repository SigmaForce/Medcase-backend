import 'dotenv/config'

import { ResendEmailService } from '../src/modules/identity/infrastructure/services/resend-email.service'
import { NotificationEmailService } from '../src/modules/notification/infrastructure/services/notification-email.service'

const TO = 'acgfju@gmail.com'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
  const identity = new ResendEmailService()
  const notification = new NotificationEmailService()

  const emails: Array<{ label: string; fn: () => Promise<void> }> = [
    {
      label: '1. Confirmação de e-mail',
      fn: () =>
        identity.sendEmailConfirmation({
          to: TO,
          token: 'tok_test_abc123',
          fullName: 'Leonardo Matos',
        }),
    },
    {
      label: '2. Redefinição de senha',
      fn: () =>
        identity.sendPasswordReset({
          to: TO,
          token: 'tok_reset_xyz789',
          fullName: 'Leonardo Matos',
        }),
    },
    {
      label: '3. Senha alterada com sucesso',
      fn: () =>
        identity.sendPasswordChanged({
          to: TO,
          fullName: 'Leonardo Matos',
        }),
    },
    {
      label: '4. Bem-vindo (conta ativada)',
      fn: () =>
        notification.send({
          to: TO,
          template: 'welcome',
          data: { first_name: 'Leonardo', cases_limit: 5 },
        }),
    },
    {
      label: '5. Lembrete — casos disponíveis',
      fn: () =>
        notification.send({
          to: TO,
          template: 'streak-reminder',
          data: {
            first_name: 'Leonardo',
            remaining_cases: 3,
            app_link: 'https://app.medcase.com',
          },
        }),
    },
    {
      label: '6. Assinatura PRO ativada',
      fn: () =>
        notification.send({
          to: TO,
          template: 'upgrade-confirmed',
          data: {
            first_name: 'Leonardo',
            next_billing_date: '24/05/2026',
            price: 'R$ 89,00',
          },
        }),
    },
    {
      label: '7. Falha no pagamento',
      fn: () =>
        notification.send({
          to: TO,
          template: 'payment-failed',
          data: {
            first_name: 'Leonardo',
            retry_date: '27/04/2026',
            portal_url: 'https://app.medcase.com/billing',
          },
        }),
    },
    {
      label: '8. Assinatura cancelada',
      fn: () =>
        notification.send({
          to: TO,
          template: 'downgraded',
          data: { first_name: 'Leonardo' },
        }),
    },
  ]

  console.log(`\nDisparando ${emails.length} e-mails para ${TO}\n`)

  for (const email of emails) {
    try {
      await email.fn()
      console.log(`  ✓ ${email.label}`)
    } catch (err) {
      console.error(`  ✗ ${email.label}:`, err)
    }
    await sleep(300)
  }

  console.log('\nConcluído! Verifique o painel do Resend.\n')
}

main()
