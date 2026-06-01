import { GetObjectivePerformance } from './GetObjectivePerformance'

describe('GetObjectivePerformance', () => {
  it('returns overall accuracy and strongest/weakest areas', async () => {
    const repo = {
      findPerformanceAttempts: jest.fn().mockResolvedValue([
        {
          isCorrect: true,
          question: { specialtyId: 1, difficulty: 'beginner', sourceType: 'inep', tags: ['cardio'] },
        },
        {
          isCorrect: false,
          question: { specialtyId: 2, difficulty: 'advanced', sourceType: 'ai_generated', tags: ['pedia'] },
        },
      ]),
    }
    const useCase = new GetObjectivePerformance(repo as any)

    const result = await useCase.execute({ userId: 'u1' })

    expect(result.overall).toMatchObject({ total_answered: 2, correct: 1, accuracy: 50 })
    expect(result.weakestAreas[0]).toMatchObject({ accuracy: 0 })
    expect(result.strongestAreas[0]).toMatchObject({ accuracy: 100 })
  })
})
