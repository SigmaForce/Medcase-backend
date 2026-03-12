import { Inject, Injectable } from '@nestjs/common'
import { IUserBadgeRepository } from '../../../identity/domain/interfaces/user-badge-repository.interface'
import { UserBadge, BadgeSlug } from '../../../identity/domain/entities/user-badge.entity'
import { UserStreak } from '../../../identity/domain/entities/user-streak.entity'

export interface BadgeAwarderInput {
  userId: string
  streak: UserStreak
  scoreTotal: number
}

type BadgeCondition = {
  slug: BadgeSlug
  check: (input: BadgeAwarderInput) => boolean
}

const BADGE_CONDITIONS: BadgeCondition[] = [
  { slug: 'first_case', check: ({ streak }) => streak.totalSessions === 1 },
  { slug: 'ten_cases', check: ({ streak }) => streak.totalSessions === 10 },
  { slug: 'streak_3', check: ({ streak }) => streak.currentStreak >= 3 },
  { slug: 'streak_7', check: ({ streak }) => streak.currentStreak >= 7 },
  { slug: 'perfect_score', check: ({ scoreTotal }) => scoreTotal >= 100 },
]

@Injectable()
export class BadgeAwarderService {
  constructor(
    @Inject('IUserBadgeRepository') private readonly badgeRepo: IUserBadgeRepository,
  ) {}

  async award(input: BadgeAwarderInput): Promise<BadgeSlug[]> {
    const awarded: BadgeSlug[] = []

    for (const condition of BADGE_CONDITIONS) {
      if (!condition.check(input)) continue
      const alreadyHas = await this.badgeRepo.hasBadge(input.userId, condition.slug)
      if (alreadyHas) continue
      await this.badgeRepo.award(UserBadge.create({ userId: input.userId, badgeSlug: condition.slug }))
      awarded.push(condition.slug)
    }

    return awarded
  }
}
