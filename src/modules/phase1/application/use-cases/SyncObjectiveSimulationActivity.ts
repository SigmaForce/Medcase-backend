import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { simulationSummary } from './phase1-presenters'
import { clampObjectiveSimulationActiveElapsed } from './objective-simulation-active-time'

export interface SyncObjectiveSimulationActivityInput {
  userId: string
  simulationId: string
  activeElapsedSecs: number
}

@Injectable()
export class SyncObjectiveSimulationActivity {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: SyncObjectiveSimulationActivityInput) {
    if (!Number.isSafeInteger(input.activeElapsedSecs) || input.activeElapsedSecs < 0) {
      throw new DomainException('INVALID_ACTIVE_ELAPSED_SECS', 400)
    }

    const simulation = await this.repo.findSimulationById(input.simulationId)
    if (!simulation) {
      throw new DomainException('SIMULATION_NOT_FOUND', 404)
    }
    if (simulation.userId !== input.userId) {
      throw new DomainException('FORBIDDEN', 403)
    }
    if (simulation.status !== 'in_progress') {
      throw new DomainException('SIMULATION_ALREADY_COMPLETED', 400)
    }

    const activeElapsedSecs = clampObjectiveSimulationActiveElapsed({
      currentActiveElapsedSecs: simulation.activeElapsedSecs,
      nextActiveElapsedSecs: input.activeElapsedSecs,
      timedLimitSecs: simulation.timedLimitSecs,
    })

    const updated = await this.repo.updateSimulationActiveElapsed({
      simulationId: simulation.id,
      activeElapsedSecs,
    })

    return { simulation: simulationSummary(updated) }
  }
}
