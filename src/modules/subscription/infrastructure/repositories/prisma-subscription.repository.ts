import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { Subscription } from '../../domain/entities/subscription.entity'

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(subscription: Subscription): Promise<Subscription> {
    const record = await this.prisma.subscription.create({
      data: {
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        casesLimit: subscription.casesLimit,
        casesUsed: subscription.casesUsed,
        generationsLimit: subscription.generationsLimit,
        generationsUsed: subscription.generationsUsed,
        usageResetAt: subscription.usageResetAt,
        provider: subscription.provider,
        externalSubId: subscription.externalSubId,
      },
    })
    return this.toDomain(record)
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({ where: { userId } })
    return record ? this.toDomain(record) : null
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const record = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: subscription.plan,
        status: subscription.status,
        casesLimit: subscription.casesLimit,
        casesUsed: subscription.casesUsed,
        generationsLimit: subscription.generationsLimit,
        generationsUsed: subscription.generationsUsed,
        usageResetAt: subscription.usageResetAt,
        provider: subscription.provider,
        externalSubId: subscription.externalSubId,
      },
    })
    return this.toDomain(record)
  }

  private toDomain(record: {
    id: string
    userId: string
    plan: string
    status: string
    casesLimit: number
    casesUsed: number
    generationsLimit: number
    generationsUsed: number
    usageResetAt: Date
    provider: string | null
    externalSubId: string | null
    createdAt: Date
    updatedAt: Date
  }): Subscription {
    const sub = new Subscription()
    sub.id = record.id
    sub.userId = record.userId
    sub.plan = record.plan as Subscription['plan']
    sub.status = record.status as Subscription['status']
    sub.casesLimit = record.casesLimit
    sub.casesUsed = record.casesUsed
    sub.generationsLimit = record.generationsLimit
    sub.generationsUsed = record.generationsUsed
    sub.usageResetAt = record.usageResetAt
    sub.provider = record.provider
    sub.externalSubId = record.externalSubId
    sub.createdAt = record.createdAt
    sub.updatedAt = record.updatedAt
    return sub
  }
}
