import { Inject, Injectable } from '@nestjs/common'
import { IClinicalCaseRepository } from '../../domain/interfaces/clinical-case-repository.interface'
import { ClinicalCase } from '../../domain/entities/clinical-case.entity'
import { DomainException } from '../../../../errors/domain-exception'

export interface GetCaseInput {
  id: string
}

export type GetCaseOutput = ClinicalCase

@Injectable()
export class GetCase {
  constructor(
    @Inject('IClinicalCaseRepository')
    private readonly repo: IClinicalCaseRepository,
  ) {}

  async execute(input: GetCaseInput): Promise<GetCaseOutput> {
    const clinicalCase = await this.repo.findById(input.id)

    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    if (clinicalCase.status !== 'approved') {
      throw new DomainException('CASE_NOT_AVAILABLE', 403)
    }

    return clinicalCase
  }
}
