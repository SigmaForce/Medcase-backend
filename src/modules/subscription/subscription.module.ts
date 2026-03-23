import { Module } from '@nestjs/common'

import { PrismaSubscriptionRepository } from './infrastructure/repositories/prisma-subscription.repository'
import { PrismaPaymentEventRepository } from './infrastructure/repositories/prisma-payment-event.repository'
import { PrismaInviteCodeRepository } from './infrastructure/repositories/prisma-invite-code.repository'
import { StripeAdapter } from './infrastructure/adapters/stripe.adapter'
import { MercadoPagoAdapter } from './infrastructure/adapters/mercadopago.adapter'

import { GetMySubscription } from './application/use-cases/GetMySubscription'
import { CreateCheckout } from './application/use-cases/CreateCheckout'
import { GetPortalUrl } from './application/use-cases/GetPortalUrl'
import { HandleStripeWebhook } from './application/use-cases/HandleStripeWebhook'
import { HandleMpWebhook } from './application/use-cases/HandleMpWebhook'
import { CreateInviteCodes } from './application/use-cases/CreateInviteCodes'
import { ListInviteCodes } from './application/use-cases/ListInviteCodes'
import { RedeemInviteCode } from './application/use-cases/RedeemInviteCode'
import { SubscriptionResetService } from './infrastructure/services/subscription-reset.service'

import { SubscriptionController } from './presentation/controllers/subscription.controller'
import { WebhookController } from './presentation/controllers/webhook.controller'
import { InviteController } from './presentation/controllers/invite.controller'

@Module({
  providers: [
    { provide: 'ISubscriptionRepository', useClass: PrismaSubscriptionRepository },
    { provide: 'IPaymentEventRepository', useClass: PrismaPaymentEventRepository },
    { provide: 'IInviteCodeRepository', useClass: PrismaInviteCodeRepository },
    StripeAdapter,
    MercadoPagoAdapter,
    GetMySubscription,
    CreateCheckout,
    GetPortalUrl,
    HandleStripeWebhook,
    HandleMpWebhook,
    CreateInviteCodes,
    ListInviteCodes,
    RedeemInviteCode,
    SubscriptionResetService,
  ],
  controllers: [SubscriptionController, WebhookController, InviteController],
  exports: [
    'ISubscriptionRepository',
    'IPaymentEventRepository',
    'IInviteCodeRepository',
    StripeAdapter,
    MercadoPagoAdapter,
  ],
})
export class SubscriptionModule {}
