import dayjs from 'dayjs'

export type SubscriptionPlan = 'free' | 'pro' | 'institutional'
export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'past_due'

export class Subscription {
  id: string
  userId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  casesLimit: number
  casesUsed: number
  generationsLimit: number
  generationsUsed: number
  usageResetAt: Date
  provider: string | null
  externalSubId: string | null
  createdAt: Date
  updatedAt: Date

  static createFree(userId: string): Subscription {
    const sub = new Subscription()
    sub.userId = userId
    sub.plan = 'free'
    sub.status = 'active'
    sub.casesLimit = 5
    sub.casesUsed = 0
    sub.generationsLimit = 0
    sub.generationsUsed = 0
    sub.usageResetAt = dayjs().add(1, 'month').toDate()
    sub.provider = null
    sub.externalSubId = null
    sub.createdAt = new Date()
    sub.updatedAt = new Date()
    return sub
  }
}
