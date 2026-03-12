import { UserBadge, BadgeSlug } from '../entities/user-badge.entity'

export interface IUserBadgeRepository {
  findByUser(userId: string): Promise<UserBadge[]>
  hasBadge(userId: string, badgeSlug: BadgeSlug): Promise<boolean>
  award(badge: UserBadge): Promise<UserBadge>
}
