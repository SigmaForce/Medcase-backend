import { SyncObjectiveSimulationActivity } from './SyncObjectiveSimulationActivity'
import { ObjectiveSimulation } from '../../domain/entities/objective-simulation.entity'

const makeSimulation = (overrides: Partial<ObjectiveSimulation> = {}): ObjectiveSimulation => ({
  id: 'sim1',
  userId: 'u1',
  status: 'in_progress',
  questionCount: 3,
  filters: { difficulty: ['beginner', 'advanced'], source: 'all', specialtyIds: [] },
  questionOrder: ['q1', 'q2', 'q3'],
  timedLimitSecs: 300,
  activeElapsedSecs: 100,
  scoreTotal: null,
  scorePercent: null,
  startedAt: new Date(),
  completedAt: null,
  durationSecs: null,
  ...overrides,
})

const makeRepo = (simulation: ObjectiveSimulation | null) => ({
  findSimulationById: jest.fn().mockResolvedValue(simulation),
  updateSimulationActiveElapsed: jest.fn().mockImplementation((input) => ({
    ...(simulation ?? makeSimulation()),
    activeElapsedSecs: input.activeElapsedSecs,
  })),
})

describe('SyncObjectiveSimulationActivity', () => {
  it('persists the greater active elapsed value', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 100 }))
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    const result = await useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 150 })

    expect(repo.updateSimulationActiveElapsed).toHaveBeenCalledWith({
      simulationId: 'sim1',
      activeElapsedSecs: 150,
    })
    expect(result.simulation.active_elapsed_secs).toBe(150)
  })

  it('keeps the stored value when a lower value is retried', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 180 }))
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 120 })

    expect(repo.updateSimulationActiveElapsed).toHaveBeenCalledWith({
      simulationId: 'sim1',
      activeElapsedSecs: 180,
    })
  })

  it('clamps active elapsed to the timed limit', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 100, timedLimitSecs: 300 }))
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 500 })

    expect(repo.updateSimulationActiveElapsed).toHaveBeenCalledWith({
      simulationId: 'sim1',
      activeElapsedSecs: 300,
    })
  })

  it('throws 404 when simulation does not exist', async () => {
    const repo = makeRepo(null)
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await expect(useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 1 }))
      .rejects.toMatchObject({ code: 'SIMULATION_NOT_FOUND', statusCode: 404 })
  })

  it('throws 403 when the user does not own the simulation', async () => {
    const repo = makeRepo(makeSimulation({ userId: 'u2' }))
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await expect(useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 1 }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('throws 400 when simulation is not in progress', async () => {
    const repo = makeRepo(makeSimulation({ status: 'completed' }))
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await expect(useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 1 }))
      .rejects.toMatchObject({ code: 'SIMULATION_ALREADY_COMPLETED', statusCode: 400 })
  })

  it('throws 400 when elapsed value is invalid', async () => {
    const repo = makeRepo(makeSimulation())
    const useCase = new SyncObjectiveSimulationActivity(repo as any)

    await expect(useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: -1 }))
      .rejects.toMatchObject({ code: 'INVALID_ACTIVE_ELAPSED_SECS', statusCode: 400 })
  })
})
