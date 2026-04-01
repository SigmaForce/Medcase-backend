import { Module } from '@nestjs/common'
import { SubscriptionModule } from '../subscription/subscription.module'

// Repositories
import { PrismaClinicalCaseRepository } from './infrastructure/repositories/prisma-clinical-case.repository'
import { PrismaSpecialtyRepository } from './infrastructure/repositories/prisma-specialty.repository'
import { PrismaReviewQueueRepository } from '../curation/infrastructure/repositories/prisma-review-queue.repository'

// Adapters & Services
import { OpenAiAdapter } from './infrastructure/adapters/openai.adapter'
import { CaseGeneratorService } from './infrastructure/services/case-generator.service'
import { RevalidaCaseGeneratorService } from './infrastructure/services/revalida-case-generator.service'

// Use Cases
import { ListCases } from './application/use-cases/ListCases'
import { GetCase } from './application/use-cases/GetCase'
import { GenerateCase } from './application/use-cases/GenerateCase'
import { GenerateRevalidaCase } from './application/use-cases/GenerateRevalidaCase'
import { ListSpecialties } from './application/use-cases/ListSpecialties'

// Controllers
import { CaseController } from './presentation/controllers/case.controller'
import { CaseGenerateController } from './presentation/controllers/case-generate.controller'
import { RevalidaCaseController } from './presentation/controllers/revalida-case.controller'
import { SpecialtyController } from './presentation/controllers/specialty.controller'

@Module({
  imports: [SubscriptionModule],
  providers: [
    { provide: 'IClinicalCaseRepository', useClass: PrismaClinicalCaseRepository },
    { provide: 'ISpecialtyRepository', useClass: PrismaSpecialtyRepository },
    { provide: 'IReviewQueueRepository', useClass: PrismaReviewQueueRepository },
    OpenAiAdapter,
    CaseGeneratorService,
    RevalidaCaseGeneratorService,
    ListCases,
    GetCase,
    GenerateCase,
    GenerateRevalidaCase,
    ListSpecialties,
  ],
  controllers: [CaseController, CaseGenerateController, RevalidaCaseController, SpecialtyController],
  exports: ['IClinicalCaseRepository', 'ISpecialtyRepository', CaseGeneratorService, RevalidaCaseGeneratorService],
})
export class ClinicalCaseModule {}
