import { Module } from '@nestjs/common'
import { IdentityModule } from '../identity/identity.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AnalyticsModule } from '../analytics/analytics.module'

import { NotificationEmailService } from './infrastructure/services/notification-email.service'

import { UserEmailConfirmedListener } from './application/listeners/user-email-confirmed.listener'
import { UsageLimitReachedListener } from './application/listeners/usage-limit-reached.listener'
import { SubscriptionUpgradedListener } from './application/listeners/subscription-upgraded.listener'
import { PaymentFailedListener } from './application/listeners/payment-failed.listener'
import { SubscriptionDowngradedListener } from './application/listeners/subscription-downgraded.listener'
import { CaseRejectedListener } from './application/listeners/case-rejected.listener'

import { StreakReminderCron } from './crons/streak-reminder.cron'
import { CostAlertCron } from './crons/cost-alert.cron'

@Module({
  imports: [SubscriptionModule, IdentityModule, AnalyticsModule],
  providers: [
    NotificationEmailService,
    UserEmailConfirmedListener,
    UsageLimitReachedListener,
    SubscriptionUpgradedListener,
    PaymentFailedListener,
    SubscriptionDowngradedListener,
    CaseRejectedListener,
    StreakReminderCron,
    CostAlertCron,
  ],
  exports: [NotificationEmailService],
})
export class NotificationModule {}
