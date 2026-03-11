import { Subscription } from '../entities/subscription.entity'

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>
  findByUserId(userId: string): Promise<Subscription | null>
}
