import { Subscription, UpgradeParams } from '../entities/subscription.entity'

export interface UserRecord {
  email: string
  fullName: string
  country: string
}

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>
  findByUserId(userId: string): Promise<Subscription | null>
  findByExternalId(externalSubId: string): Promise<Subscription | null>
  findByExternalCustomer(externalCustomer: string): Promise<Subscription | null>
  update(subscription: Subscription): Promise<Subscription>
  upgrade(userId: string, params: UpgradeParams): Promise<Subscription>
  downgrade(userId: string): Promise<Subscription>
  resetUsage(userId: string): Promise<Subscription>
  findDueForReset(): Promise<Subscription[]>
  findUserById(userId: string): Promise<UserRecord | null>
}
