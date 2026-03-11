import { Inject, Injectable } from '@nestjs/common'
import { IClinicalCaseRepository, ListCasesFilters, ListCasesResult } from '../../domain/interfaces/clinical-case-repository.interface'
import { CaseDifficulty, CaseLanguage, CountryContext } from '../../domain/entities/clinical-case.entity'

export interface ListCasesInput {
  specialtyId?: number
  difficulty?: CaseDifficulty
  language?: CaseLanguage
  country?: CountryContext
  page: number
  limit: number
}

export type ListCasesOutput = ListCasesResult

@Injectable()
export class ListCases {
  constructor(
    @Inject('IClinicalCaseRepository')
    private readonly repo: IClinicalCaseRepository,
  ) {}

  async execute(input: ListCasesInput): Promise<ListCasesOutput> {
    const filters: ListCasesFilters = {
      specialtyId: input.specialtyId,
      difficulty: input.difficulty,
      language: input.language,
      country: input.country,
      page: input.page,
      limit: input.limit,
    }

    return this.repo.findAll(filters)
  }
}
