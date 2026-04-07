import { Module } from '@nestjs/common'
import { ClinicalCaseModule } from '../clinical-case/clinical-case.module'
import { ClinicalSessionModule } from '../clinical-session/clinical-session.module'
import { IdentityModule } from '../identity/identity.module'

// Repositories
import { PrismaCaseRatingRepository } from './infrastructure/repositories/prisma-case-rating.repository'
import { PrismaReviewQueueRepository } from './infrastructure/repositories/prisma-review-queue.repository'

// Use Cases
import { SubmitRating } from './application/use-cases/SubmitRating'
import { GetMyRating } from './application/use-cases/GetMyRating'
import { ListReviewQueue } from './application/use-cases/ListReviewQueue'
import { GetReviewQueueCount } from './application/use-cases/GetReviewQueueCount'
import { ApproveQueueItem } from './application/use-cases/ApproveQueueItem'
import { RejectQueueItem } from './application/use-cases/RejectQueueItem'
import { RegenerateQueueItem } from './application/use-cases/RegenerateQueueItem'

// Controllers
import { RatingController } from './presentation/controllers/rating.controller'
import { ReviewQueueController } from './presentation/controllers/review-queue.controller'

@Module({
  imports: [ClinicalCaseModule, ClinicalSessionModule, IdentityModule],
  providers: [
    { provide: 'ICaseRatingRepository', useClass: PrismaCaseRatingRepository },
    { provide: 'IReviewQueueRepository', useClass: PrismaReviewQueueRepository },
    SubmitRating,
    GetMyRating,
    ListReviewQueue,
    GetReviewQueueCount,
    ApproveQueueItem,
    RejectQueueItem,
    RegenerateQueueItem,
  ],
  controllers: [RatingController, ReviewQueueController],
})
export class CurationModule {}
