import { CompleteObjectiveSimulation } from './CompleteObjectiveSimulation'
import { ObjectiveQuestion } from '../../domain/entities/objective-question.entity'
import { ObjectiveSimulation } from '../../domain/entities/objective-simulation.entity'

const makeQuestion = (id: string, difficulty: ObjectiveQuestion['difficulty'], specialtyId: number, tags: string[]): ObjectiveQuestion => ({
  id,
  specialtyId,
  createdById: null,
  stem: `Question ${id}`,
  alternatives: [
    { key: 'A', text: 'A' },
    { key: 'B', text: 'B' },
  ],
  correctAlternative: 'A',
  explanation: 'Explanation',
  difficulty,
  status: 'approved',
  sourceType: 'inep',
  sourceLabel: 'INEP 2024/1',
  year: 2024,
  edition: '1',
  externalId: id,
  sourceUrl: null,
  tags,
  isAnnulled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const questions = [
  makeQuestion('q1', 'beginner', 1, ['cardio']),
  makeQuestion('q2', 'advanced', 2, ['pedia']),
  makeQuestion('q3', 'advanced', 2, ['pedia']),
]

const makeSimulation = (overrides: Partial<ObjectiveSimulation> = {}): ObjectiveSimulation => ({
  id: 'sim1',
  userId: 'u1',
  status: 'in_progress',
  questionCount: 3,
  filters: { difficulty: ['beginner', 'advanced'], source: 'all', specialtyIds: [] },
  questionOrder: ['q1', 'q2', 'q3'],
  timedLimitSecs: 18000,
  activeElapsedSecs: 90,
  scoreTotal: null,
  scorePercent: null,
  startedAt: new Date(Date.now() - 60_000),
  completedAt: null,
  durationSecs: null,
  ...overrides,
})

const makeRepo = (simulation: ObjectiveSimulation) => ({
  findSimulationById: jest.fn().mockResolvedValue(simulation),
  findQuestionsByIds: jest.fn().mockResolvedValue(questions),
  findAttemptsBySimulation: jest.fn().mockResolvedValue([
    { questionId: 'q1', selectedAlternative: 'A', isCorrect: true },
    { questionId: 'q2', selectedAlternative: 'B', isCorrect: false },
  ]),
  completeSimulation: jest.fn().mockImplementation((input) => ({
    ...simulation,
    status: 'completed',
    completedAt: input.completedAt,
    durationSecs: input.durationSecs,
    activeElapsedSecs: input.activeElapsedSecs,
    scoreTotal: input.scoreTotal,
    scorePercent: input.scorePercent,
  })),
})

describe('CompleteObjectiveSimulation', () => {
  it('calculates score and grouped performance, then exposes answers', async () => {
    const repo = makeRepo(makeSimulation())
    const useCase = new CompleteObjectiveSimulation(repo as any)

    const result = await useCase.execute({ userId: 'u1', simulationId: 'sim1' })

    expect(result.result).toMatchObject({
      score_total: 1,
      score_percent: 33.33,
      unanswered: 1,
    })
    expect(result.result.by_difficulty.advanced).toMatchObject({ correct: 0, total: 2, accuracy: 0 })
    expect(result.questions[0]).toHaveProperty('correct_alternative', 'A')
    expect(result.simulation).toMatchObject({
      duration_secs: 90,
      active_elapsed_secs: 90,
    })
  })

  it('uses active elapsed from the request body as duration', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 30 }))
    const useCase = new CompleteObjectiveSimulation(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 120 })

    expect(repo.completeSimulation).toHaveBeenCalledWith(expect.objectContaining({
      durationSecs: 120,
      activeElapsedSecs: 120,
    }))
  })

  it('uses stored active elapsed when the request body is missing', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 240 }))
    const useCase = new CompleteObjectiveSimulation(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1' })

    expect(repo.completeSimulation).toHaveBeenCalledWith(expect.objectContaining({
      durationSecs: 240,
      activeElapsedSecs: 240,
    }))
  })

  it('falls back to calendar duration for legacy rows without active elapsed', async () => {
    const startedAt = new Date(Date.now() - 60_000)
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: null, startedAt }))
    const useCase = new CompleteObjectiveSimulation(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1' })

    const completeInput = repo.completeSimulation.mock.calls[0][0]
    expect(completeInput.durationSecs).toBeGreaterThanOrEqual(59)
    expect(completeInput.activeElapsedSecs).toBe(completeInput.durationSecs)
  })

  it('clamps active elapsed to the timed limit', async () => {
    const repo = makeRepo(makeSimulation({ activeElapsedSecs: 100, timedLimitSecs: 300 }))
    const useCase = new CompleteObjectiveSimulation(repo as any)

    await useCase.execute({ userId: 'u1', simulationId: 'sim1', activeElapsedSecs: 500 })

    expect(repo.completeSimulation).toHaveBeenCalledWith(expect.objectContaining({
      durationSecs: 300,
      activeElapsedSecs: 300,
    }))
  })
})
