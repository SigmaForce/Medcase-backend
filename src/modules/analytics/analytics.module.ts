import { Module } from '@nestjs/common'
import { PrismaUsageMetricsRepository } from './infrastructure/repositories/prisma-usage-metrics.repository'
import { PostHogService } from './infrastructure/services/posthog.service'
import { GetAdminCosts } from './application/use-cases/GetAdminCosts'
import { CostsController } from './presentation/controllers/costs.controller'

@Module({
  providers: [
    { provide: 'IUsageMetricsRepository', useClass: PrismaUsageMetricsRepository },
    PostHogService,
    GetAdminCosts,
  ],
  controllers: [CostsController],
  exports: ['IUsageMetricsRepository', PostHogService],
})
export class AnalyticsModule {}
