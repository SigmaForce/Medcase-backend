import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { IUserStreakRepository } from '../../identity/domain/interfaces/user-streak-repository.interface'
import { NotificationEmailService } from '../infrastructure/services/notification-email.service'

const BATCH_SIZE = 100

@Injectable()
export class StreakReminderCron {
  private readonly logger = new Logger(StreakReminderCron.name)

  constructor(
    @Inject('IUserStreakRepository')
    private readonly streakRepo: IUserStreakRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @Cron('0 21 * * *')
  async sendStreakReminders(): Promise<void> {
    let skip = 0
    let processed = 0
    let failed = 0

    while (true) {
      const users = await this.streakRepo.findAtRiskToday({ take: BATCH_SIZE, skip })
      if (users.length === 0) break

      for (const user of users) {
        try {
          await this.emailService.send({
            to: user.email,
            template: 'streak-reminder',
            data: {
              first_name: user.fullName.split(' ')[0],
              streak_days: user.currentStreak,
            },
          })
          processed++
        } catch (err) {
          failed++
          this.logger.error('Failed to send streak reminder', { userId: user.userId, error: err })
        }
      }

      if (users.length < BATCH_SIZE) break
      skip += BATCH_SIZE
    }

    this.logger.log(`Streak reminders sent: ${processed}, failed: ${failed}`)
  }
}
