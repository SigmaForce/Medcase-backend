import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from './infra/database/database.module'
import { DomainExceptionFilter } from './infra/http/filters/domain-exception.filter'
import { JwtAuthGuard } from './infra/http/guards/jwt-auth.guard'
import { ThrottlerBehindProxyGuard } from './infra/http/guards/throttler-behind-proxy.guard'
import { SubscriptionModule } from './modules/subscription/subscription.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { IdentityModule } from './modules/identity/identity.module'
import { NotificationModule } from './modules/notification/notification.module'
import { ClinicalCaseModule } from './modules/clinical-case/clinical-case.module'
import { ClinicalSessionModule } from './modules/clinical-session/clinical-session.module'
import { CurationModule } from './modules/curation/curation.module'
import { env } from './config/env'

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),
    JwtModule.register({ secret: env.JWT_SECRET }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 120 },
      { name: 'register', ttl: 3600000, limit: 20 },
      { name: 'login', ttl: 900000, limit: 50 },
      { name: 'forgot', ttl: 3600000, limit: 20 },
      { name: 'resend', ttl: 120000, limit: 10 },
      { name: 'message', ttl: 60000, limit: 20 },
      { name: 'generate', ttl: 60000, limit: 5 },
    ]),
    SubscriptionModule,
    AnalyticsModule,
    IdentityModule,
    NotificationModule,
    ClinicalCaseModule,
    ClinicalSessionModule,
    CurationModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
