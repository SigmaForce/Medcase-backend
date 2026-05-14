import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../../infra/database/prisma.service'

@Injectable()
export class CleanExpiredTokensCron {
  private readonly logger = new Logger(CleanExpiredTokensCron.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *') // 03:00 UTC daily
  async cleanExpiredTokens(): Promise<void> {
    const now = new Date()
    try {
      const [ev, pr, rt] = await Promise.all([
        this.prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
        this.prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
        this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      ])
      this.logger.log(
        `Cleaned ${ev.count} email verifications, ${pr.count} password resets, ${rt.count} refresh tokens`,
      )
    } catch (err) {
      this.logger.error('Failed to clean expired tokens', err)
    }
  }
}
