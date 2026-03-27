import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { env } from '../../config/env'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AnalyticsModule } from '../analytics/analytics.module'

// Infrastructure services
import { PrismaTransactionManager } from './infrastructure/services/prisma-transaction-manager'

// Repositories
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository'
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository'
import { PrismaEmailVerificationRepository } from './infrastructure/repositories/prisma-email-verification.repository'
import { PrismaPasswordResetRepository } from './infrastructure/repositories/prisma-password-reset.repository'
import { PrismaAuditLogRepository } from './infrastructure/repositories/prisma-audit-log.repository'

// Services
import { ResendEmailService } from './infrastructure/services/resend-email.service'

// Use Cases
import { RegisterUser } from './application/use-cases/RegisterUser'
import { LoginUser } from './application/use-cases/LoginUser'
import { RefreshTokens } from './application/use-cases/RefreshTokens'
import { LogoutUser } from './application/use-cases/LogoutUser'
import { ConfirmEmail } from './application/use-cases/ConfirmEmail'
import { ResendConfirmation } from './application/use-cases/ResendConfirmation'
import { ForgotPassword } from './application/use-cases/ForgotPassword'
import { ResetPassword } from './application/use-cases/ResetPassword'
import { GetMe } from './application/use-cases/GetMe'
import { CompleteOnboarding } from './application/use-cases/CompleteOnboarding'

// Gamification & Performance Repositories
import { PrismaUserStreakRepository } from './infrastructure/repositories/prisma-user-streak.repository'
import { PrismaUserBadgeRepository } from './infrastructure/repositories/prisma-user-badge.repository'
import { PrismaStudentPerformanceRepository } from './infrastructure/repositories/prisma-student-performance.repository'

// Gamification & Performance Use Cases
import { GetPerformance } from './application/use-cases/GetPerformance'
import { GetPerformanceBySpecialty } from './application/use-cases/GetPerformanceBySpecialty'
import { GetStats } from './application/use-cases/GetStats'
import { UpdateProfile } from './application/use-cases/UpdateProfile'

// Controllers
import { AuthController } from './presentation/controllers/auth.controller'
import { UsersController } from './presentation/controllers/users.controller'

@Module({
  imports: [
    SubscriptionModule,
    AnalyticsModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: 3600 },
    }),
  ],
  providers: [
    { provide: 'ITransactionManager', useClass: PrismaTransactionManager },
    { provide: 'IUserRepository', useClass: PrismaUserRepository },
    { provide: 'IRefreshTokenRepository', useClass: PrismaRefreshTokenRepository },
    { provide: 'IEmailVerificationRepository', useClass: PrismaEmailVerificationRepository },
    { provide: 'IPasswordResetRepository', useClass: PrismaPasswordResetRepository },
    { provide: 'IAuditLogRepository', useClass: PrismaAuditLogRepository },
    { provide: 'IEmailService', useClass: ResendEmailService },
    { provide: 'IUserStreakRepository', useClass: PrismaUserStreakRepository },
    { provide: 'IUserBadgeRepository', useClass: PrismaUserBadgeRepository },
    { provide: 'IStudentPerformanceRepository', useClass: PrismaStudentPerformanceRepository },
    RegisterUser,
    LoginUser,
    RefreshTokens,
    LogoutUser,
    ConfirmEmail,
    ResendConfirmation,
    ForgotPassword,
    ResetPassword,
    GetMe,
    CompleteOnboarding,
    GetPerformance,
    GetPerformanceBySpecialty,
    GetStats,
    UpdateProfile,
  ],
  controllers: [AuthController, UsersController],
  exports: ['IUserStreakRepository', 'IUserBadgeRepository', 'IStudentPerformanceRepository'],
})
export class IdentityModule {}
