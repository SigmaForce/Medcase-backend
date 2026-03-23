import { Inject, Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { IUserStreakRepository } from '../../identity/domain/interfaces/user-streak-repository.interface'
import { NotificationEmailService } from '../infrastructure/services/notification-email.service'

@Injectable()
export class StreakReminderCron {
  constructor(
    @Inject('IUserStreakRepository')
    private readonly streakRepo: IUserStreakRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @Cron('0 21 * * *')
  async sendStreakReminders(): Promise<void> {
    const users = await this.streakRepo.findAtRiskToday()
    for (const user of users) {
      await this.emailService.send({
        to: user.email,
        template: 'streak-reminder',
        data: {
          first_name: user.fullName.split(' ')[0],
          streak_days: user.currentStreak,
        },
      })
    }
  }
}
