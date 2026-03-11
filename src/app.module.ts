import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from './infra/database/database.module'
import { DomainExceptionFilter } from './infra/http/filters/domain-exception.filter'
import { JwtAuthGuard } from './infra/http/guards/jwt-auth.guard'
import { ThrottlerBehindProxyGuard } from './infra/http/guards/throttler-behind-proxy.guard'
import { IdentityModule } from './modules/identity/identity.module'
import { env } from './config/env'

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({ secret: env.JWT_SECRET }),
    ThrottlerModule.forRoot([
      { name: 'register', ttl: 3600000, limit: 3 },
      { name: 'login', ttl: 900000, limit: 10 },
      { name: 'forgot', ttl: 3600000, limit: 3 },
      { name: 'resend', ttl: 120000, limit: 1 },
    ]),
    IdentityModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
