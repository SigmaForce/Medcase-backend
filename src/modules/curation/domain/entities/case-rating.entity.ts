export interface CreateCaseRatingProps {
  id?: string
  caseId: string
  userId: string
  score: number
  issues?: string[]
  comment?: string | null
  createdAt?: Date
}

export class CaseRating {
  id: string
  caseId: string
  userId: string
  score: number
  issues: string[]
  comment: string | null
  createdAt: Date

  static create(props: CreateCaseRatingProps): CaseRating {
    const rating = new CaseRating()
    rating.id = props.id ?? ''
    rating.caseId = props.caseId
    rating.userId = props.userId
    rating.score = props.score
    rating.issues = props.issues ?? []
    rating.comment = props.comment ?? null
    rating.createdAt = props.createdAt ?? new Date()
    return rating
  }
}
