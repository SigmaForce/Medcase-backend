import { Module } from '@nestjs/common'
import { PrismaSubscriptionRepository } from './infrastructure/repositories/prisma-subscription.repository'

@Module({
  providers: [{ provide: 'ISubscriptionRepository', useClass: PrismaSubscriptionRepository }],
  exports: ['ISubscriptionRepository'],
})
export class SubscriptionModule {}
