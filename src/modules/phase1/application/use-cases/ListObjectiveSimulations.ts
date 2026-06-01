import { Inject, Injectable } from '@nestjs/common'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { simulationSummary } from './phase1-presenters'

export interface ListObjectiveSimulationsInput {
  userId: string
  page: number
  limit: number
}

@Injectable()
export class ListObjectiveSimulations {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: ListObjectiveSimulationsInput) {
    const result = await this.repo.listSimulations(input)

    return {
      data: result.data.map((simulation) => simulationSummary(simulation)),
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / input.limit),
      },
    }
  }
}
