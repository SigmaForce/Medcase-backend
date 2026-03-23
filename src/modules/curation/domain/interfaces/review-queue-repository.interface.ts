import { ReviewQueueItem } from '../entities/review-queue-item.entity'

export interface ListQueueFilters {
  status?: string
  page: number
  limit: number
}

export interface QueueCaseSnapshot {
  id: string
  title: string
  status: string
  difficulty: string
  language: string
  countryContext: string
  specialty: { id: number; namePt: string; nameEs: string }
  createdAt: Date
}

export interface QueueItemWithCase extends ReviewQueueItem {
  case: QueueCaseSnapshot
}

export interface ListQueueResult {
  data: QueueItemWithCase[]
  meta: { page: number; limit: number; total: number }
}

export interface IReviewQueueRepository {
  create(item: ReviewQueueItem): Promise<ReviewQueueItem>
  findById(id: string): Promise<ReviewQueueItem | null>
  findByCaseId(caseId: string): Promise<ReviewQueueItem | null>
  list(filters: ListQueueFilters): Promise<ListQueueResult>
  update(item: ReviewQueueItem): Promise<ReviewQueueItem>
}
