import { ReviewQueueItem } from '../entities/review-queue-item.entity'

export interface ListQueueFilters {
  status?: string
  page: number
  limit: number
}

export interface ListQueueResult {
  data: ReviewQueueItem[]
  meta: { page: number; limit: number; total: number }
}

export interface IReviewQueueRepository {
  create(item: ReviewQueueItem): Promise<ReviewQueueItem>
  findById(id: string): Promise<ReviewQueueItem | null>
  findByCaseId(caseId: string): Promise<ReviewQueueItem | null>
  list(filters: ListQueueFilters): Promise<ListQueueResult>
  update(item: ReviewQueueItem): Promise<ReviewQueueItem>
}
