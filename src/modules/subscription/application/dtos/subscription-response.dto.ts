import { SubscriptionPlan, SubscriptionStatus } from '../../domain/entities/subscription.entity'

export interface SubscriptionResponseDto {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  casesLimit: number
  casesUsed: number
  casesRemaining: number
  generationsLimit: number
  generationsUsed: number
  usageResetAt: Date
}
