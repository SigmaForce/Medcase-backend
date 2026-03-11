import { ClinicalCase, CaseDifficulty, CaseLanguage, CountryContext } from '../entities/clinical-case.entity'

export interface ListCasesFilters {
  specialtyId?: number
  difficulty?: CaseDifficulty
  language?: CaseLanguage
  country?: CountryContext
  page: number
  limit: number
}

export interface ListCasesResult {
  data: ClinicalCase[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export interface IClinicalCaseRepository {
  findAll(filters: ListCasesFilters): Promise<ListCasesResult>
  findById(id: string): Promise<ClinicalCase | null>
  create(clinicalCase: ClinicalCase): Promise<ClinicalCase>
}
