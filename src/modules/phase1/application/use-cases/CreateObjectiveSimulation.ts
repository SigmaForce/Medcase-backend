import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { ObjectiveQuestionSelectorService } from '../../domain/services/objective-question-selector.service'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { ObjectiveDifficulty, ObjectiveQuestionSource } from '../../domain/entities/objective-question.entity'
import { simulationSummary } from './phase1-presenters'

const DEFAULT_DIFFICULTIES: ObjectiveDifficulty[] = ['beginner', 'intermediate', 'advanced']

export interface CreateObjectiveSimulationInput {
  userId: string
  questionCount?: number
  difficulty?: ObjectiveDifficulty[]
  source?: ObjectiveQuestionSource | 'all'
  specialtyIds?: number[]
  timedLimitSecs?: number
}

@Injectable()
export class CreateObjectiveSimulation {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
    private readonly selector: ObjectiveQuestionSelectorService,
  ) {}

  async execute(input: CreateObjectiveSimulationInput) {
    const questionCount = input.questionCount ?? 100
    const filters = {
      difficulty: input.difficulty?.length ? input.difficulty : DEFAULT_DIFFICULTIES,
      source: input.source ?? 'all',
      specialtyIds: input.specialtyIds ?? [],
    }

    const candidates = await this.repo.findApprovedForSimulation({
      ...filters,
      questionCount,
    })

    if (candidates.length < questionCount) {
      throw new DomainException(
        'INSUFFICIENT_QUESTIONS',
        422,
        JSON.stringify({ requested: questionCount, available: candidates.length }),
      )
    }

    const selected = this.selector.select(candidates, questionCount)
    const simulation = await this.repo.createSimulation({
      userId: input.userId,
      questionCount,
      filters,
      questionOrder: selected.map((q) => q.id),
      timedLimitSecs: input.timedLimitSecs ?? 18000,
    })

    return {
      simulation: simulationSummary(simulation),
      questions: selected.map((q, index) => ({
        order: index + 1,
        id: q.id,
        specialty_id: q.specialtyId,
        stem: q.stem,
        alternatives: q.alternatives,
        difficulty: q.difficulty,
        source_type: q.sourceType,
        source_label: q.sourceLabel,
        tags: q.tags,
      })),
    }
  }
}
