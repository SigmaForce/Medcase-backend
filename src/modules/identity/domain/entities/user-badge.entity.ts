export type BadgeSlug =
  | 'first_case'
  | 'ten_cases'
  | 'streak_3'
  | 'streak_7'
  | 'perfect_score'
  | 'all_specialties'
  | 'cardio_master'

export interface CreateUserBadgeProps {
  id?: string
  userId: string
  badgeSlug: BadgeSlug
  earnedAt?: Date
}

export class UserBadge {
  id: string
  userId: string
  badgeSlug: BadgeSlug
  earnedAt: Date

  static create(props: CreateUserBadgeProps): UserBadge {
    const badge = new UserBadge()
    badge.id = props.id ?? ''
    badge.userId = props.userId
    badge.badgeSlug = props.badgeSlug
    badge.earnedAt = props.earnedAt ?? new Date()
    return badge
  }
}
