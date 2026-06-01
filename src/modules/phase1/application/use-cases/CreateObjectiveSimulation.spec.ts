import { CreateObjectiveSimulation } from './CreateObjectiveSimulation'
import { ObjectiveQuestionSelectorService } from '../../domain/services/objective-question-selector.service'
import { ObjectiveQuestion } from '../../domain/entities/objective-question.entity'

const makeQuestion = (i: number): ObjectiveQuestion => ({
  id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
  specialtyId: (i % 5) + 1,
  createdById: null,
  stem: `Question ${i}`,
  alternatives: [
    { key: 'A', text: 'A' },
    { key: 'B', text: 'B' },
  ],
  correctAlternative: 'A',
  explanation: 'Explanation',
  difficulty: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
  status: 'approved',
  sourceType: 'inep',
  sourceLabel: 'Caso Real INEP 2024/1',
  year: 2024,
  edition: '1',
  externalId: `inep:2024_1:objetiva:${i}`,
  sourceUrl: null,
  tags: ['cardiologia'],
  isAnnulled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('CreateObjectiveSimulation', () => {
  it('uses MVP defaults and creates a 100-question simulation', async () => {
    const questions = Array.from({ length: 100 }, (_, i) => makeQuestion(i + 1))
    const repo = {
      findApprovedForSimulation: jest.fn().mockResolvedValue(questions),
      createSimulation: jest.fn().mockImplementation((input) => ({
        id: 'sim-1',
        status: 'in_progress',
        scoreTotal: null,
        scorePercent: null,
        startedAt: new Date(),
        completedAt: null,
        durationSecs: null,
        activeElapsedSecs: 0,
        ...input,
      })),
    }
    const useCase = new CreateObjectiveSimulation(repo as any, new ObjectiveQuestionSelectorService())

    const result = await useCase.execute({ userId: 'user-1' })

    expect(repo.findApprovedForSimulation).toHaveBeenCalledWith({
      questionCount: 100,
      difficulty: ['beginner', 'intermediate', 'advanced'],
      source: 'all',
      specialtyIds: [],
    })
    expect(repo.createSimulation).toHaveBeenCalledWith(expect.objectContaining({
      questionCount: 100,
      timedLimitSecs: 18000,
    }))
    expect(result.simulation.active_elapsed_secs).toBe(0)
    expect(result.questions).toHaveLength(100)
    expect(result.questions[0]).not.toHaveProperty('correct_alternative')
  })

  it('fails when the filtered bank cannot satisfy the requested count', async () => {
    const repo = {
      findApprovedForSimulation: jest.fn().mockResolvedValue([makeQuestion(1)]),
    }
    const useCase = new CreateObjectiveSimulation(repo as any, new ObjectiveQuestionSelectorService())

    await expect(useCase.execute({ userId: 'user-1', questionCount: 2 }))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_QUESTIONS', statusCode: 422 })
  })
})
