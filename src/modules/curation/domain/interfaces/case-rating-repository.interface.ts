import { CaseRating } from '../entities/case-rating.entity'

export interface ICaseRatingRepository {
  findByUserAndCase(userId: string, caseId: string): Promise<CaseRating | null>
  create(rating: CaseRating): Promise<CaseRating>
  countByCase(caseId: string): Promise<number>
  avgByCase(caseId: string): Promise<number>
}
