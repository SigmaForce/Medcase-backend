import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { ISubscriptionRepository, UserRecord } from '../../domain/interfaces/subscription-repository.interface'
import { Subscription, UpgradeParams } from '../../domain/entities/subscription.entity'

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
        externalCustomer: subscription.externalCustomer,
        trialEndsAt: subscription.trialEndsAt,
        cancelAt: subscription.cancelAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    })
    return this.toDomain(record)
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({ where: { userId } })
    return record ? this.toDomain(record) : null
  }

  async findByExternalId(externalSubId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({ where: { externalSubId } })
    return record ? this.toDomain(record) : null
  }

  async findByExternalCustomer(externalCustomer: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({ where: { externalCustomer } })
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
        externalCustomer: subscription.externalCustomer,
        trialEndsAt: subscription.trialEndsAt,
        cancelAt: subscription.cancelAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    })
    return this.toDomain(record)
  }

  async upgrade(userId: string, params: UpgradeParams): Promise<Subscription> {
    const record = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: params.plan,
        status: params.status,
        provider: params.provider,
        externalSubId: params.externalSubId,
        externalCustomer: params.externalCustomer,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        casesLimit: 999,
        generationsLimit: 999,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
    })
    return this.toDomain(record)
  }

  async downgrade(userId: string): Promise<Subscription> {
    const record = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: 'free',
        status: 'active',
        casesLimit: 5,
        generationsLimit: 0,
        casesUsed: 0,
        generationsUsed: 0,
        usageResetAt: dayjs().add(1, 'month').toDate(),
        provider: null,
        externalSubId: null,
        externalCustomer: null,
        trialEndsAt: null,
        cancelAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    })
    return this.toDomain(record)
  }

  async resetUsage(userId: string): Promise<Subscription> {
    const record = await this.prisma.subscription.update({
      where: { userId },
      data: {
        casesUsed: 0,
        generationsUsed: 0,
        usageResetAt: dayjs().add(1, 'month').toDate(),
      },
    })
    return this.toDomain(record)
  }

  async findDueForReset(): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: {
        usageResetAt: { lte: new Date() },
        OR: [{ casesUsed: { gt: 0 } }, { generationsUsed: { gt: 0 } }],
      },
    })
    return records.map((r) => this.toDomain(r))
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, country: true },
    })
    return user
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
    externalCustomer: string | null
    trialEndsAt: Date | null
    cancelAt: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
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
    sub.externalCustomer = record.externalCustomer
    sub.trialEndsAt = record.trialEndsAt
    sub.cancelAt = record.cancelAt
    sub.currentPeriodEnd = record.currentPeriodEnd
    sub.cancelAtPeriodEnd = record.cancelAtPeriodEnd
    sub.createdAt = record.createdAt
    sub.updatedAt = record.updatedAt
    return sub
  }
}
