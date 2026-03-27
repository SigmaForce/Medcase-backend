import dayjs from 'dayjs'

export type SubscriptionPlan = 'free' | 'pro' | 'institutional'
export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'past_due'

export interface UpgradeParams {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  provider: string
  externalSubId: string
  externalCustomer: string
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
}

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
  externalCustomer: string | null
  trialEndsAt: Date | null
  cancelAt: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
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
    sub.externalCustomer = null
    sub.trialEndsAt = null
    sub.cancelAt = null
    sub.currentPeriodEnd = null
    sub.cancelAtPeriodEnd = false
    sub.createdAt = new Date()
    sub.updatedAt = new Date()
    return sub
  }

  static createTrial(userId: string, trialDays: number): Subscription {
    const sub = new Subscription()
    sub.userId = userId
    sub.plan = 'pro'
    sub.status = 'trial'
    sub.casesLimit = 999
    sub.casesUsed = 0
    sub.generationsLimit = 999
    sub.generationsUsed = 0
    sub.usageResetAt = dayjs().add(1, 'month').toDate()
    sub.provider = null
    sub.externalSubId = null
    sub.externalCustomer = null
    sub.trialEndsAt = dayjs().add(trialDays, 'day').toDate()
    sub.cancelAt = null
    sub.currentPeriodEnd = null
    sub.cancelAtPeriodEnd = false
    sub.createdAt = new Date()
    sub.updatedAt = new Date()
    return sub
  }

  upgradeToPro(params: UpgradeParams): void {
    this.plan = params.plan
    this.status = params.status
    this.provider = params.provider
    this.externalSubId = params.externalSubId
    this.externalCustomer = params.externalCustomer
    this.currentPeriodEnd = params.currentPeriodEnd ?? null
    this.casesLimit = 999
    this.generationsLimit = 999
    this.trialEndsAt = params.trialEndsAt ?? null
    this.cancelAtPeriodEnd = false
  }

  downgradeToFree(): void {
    this.plan = 'free'
    this.status = 'active'
    this.casesLimit = 5
    this.generationsLimit = 0
    this.casesUsed = 0
    this.generationsUsed = 0
    this.usageResetAt = dayjs().add(1, 'month').toDate()
    this.provider = null
    this.externalSubId = null
    this.externalCustomer = null
    this.trialEndsAt = null
    this.cancelAt = null
    this.currentPeriodEnd = null
    this.cancelAtPeriodEnd = false
  }

  resetUsage(): void {
    this.casesUsed = 0
    this.generationsUsed = 0
    this.usageResetAt = dayjs().add(1, 'month').toDate()
  }
}
