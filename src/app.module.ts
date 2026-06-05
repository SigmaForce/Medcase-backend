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
import { HealthController } from './infra/http/health/health.controller'
import { SubscriptionModule } from './modules/subscription/subscription.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { IdentityModule } from './modules/identity/identity.module'
import { NotificationModule } from './modules/notification/notification.module'
import { ClinicalCaseModule } from './modules/clinical-case/clinical-case.module'
import { ClinicalSessionModule } from './modules/clinical-session/clinical-session.module'
import { CurationModule } from './modules/curation/curation.module'
import { Phase1Module } from './modules/phase1/phase1.module'
import { env } from './config/env'

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),
    JwtModule.register({ secret: env.JWT_SECRET }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
    ]),
    SubscriptionModule,
    AnalyticsModule,
    IdentityModule,
    NotificationModule,
    ClinicalCaseModule,
    ClinicalSessionModule,
    CurationModule,
    Phase1Module,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
