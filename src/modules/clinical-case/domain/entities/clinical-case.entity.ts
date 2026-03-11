import { CaseStatusValue } from '../value-objects/case-status.vo'

export type CaseDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type CaseLanguage = 'pt' | 'es'
export type CountryContext = 'BR' | 'PY'

export interface CreateClinicalCaseProps {
  id?: string
  specialtyId: number
  createdById: string
  reviewedById?: string | null
  title: string
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
  status?: CaseStatusValue
  caseBrief: Record<string, unknown>
  availableExams: Record<string, unknown>
  generationPrompt?: string | null
  avgRating?: number
  totalRatings?: number
  flaggedCount?: number
  createdAt?: Date
  updatedAt?: Date
}

export class ClinicalCase {
  id: string
  specialtyId: number
  createdById: string
  reviewedById: string | null
  title: string
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
  status: CaseStatusValue
  caseBrief: Record<string, unknown>
  availableExams: Record<string, unknown>
  generationPrompt: string | null
  avgRating: number
  totalRatings: number
  flaggedCount: number
  createdAt: Date
  updatedAt: Date

  static create(props: CreateClinicalCaseProps): ClinicalCase {
    const clinicalCase = new ClinicalCase()
    clinicalCase.id = props.id ?? ''
    clinicalCase.specialtyId = props.specialtyId
    clinicalCase.createdById = props.createdById
    clinicalCase.reviewedById = props.reviewedById ?? null
    clinicalCase.title = props.title
    clinicalCase.difficulty = props.difficulty
    clinicalCase.language = props.language
    clinicalCase.countryContext = props.countryContext
    clinicalCase.status = props.status ?? 'pending_review'
    clinicalCase.caseBrief = props.caseBrief
    clinicalCase.availableExams = props.availableExams
    clinicalCase.generationPrompt = props.generationPrompt ?? null
    clinicalCase.avgRating = props.avgRating ?? 0
    clinicalCase.totalRatings = props.totalRatings ?? 0
    clinicalCase.flaggedCount = props.flaggedCount ?? 0
    clinicalCase.createdAt = props.createdAt ?? new Date()
    clinicalCase.updatedAt = props.updatedAt ?? new Date()
    return clinicalCase
  }
}
