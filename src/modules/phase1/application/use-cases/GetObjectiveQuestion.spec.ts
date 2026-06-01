import { GetObjectiveQuestion } from './GetObjectiveQuestion'
import { ObjectiveQuestion } from '../../domain/entities/objective-question.entity'

const question: ObjectiveQuestion = {
  id: 'q1',
  specialtyId: 1,
  createdById: null,
  stem: 'Paciente apresenta dor toracica. Qual a conduta?',
  alternatives: [
    { key: 'A', text: 'Conduta A' },
    { key: 'B', text: 'Conduta B' },
  ],
  correctAlternative: 'A',
  explanation: 'Porque A e a melhor alternativa.',
  difficulty: 'intermediate',
  status: 'approved',
  sourceType: 'inep',
  sourceLabel: 'Caso Real INEP 2024/1',
  year: 2024,
  edition: '1',
  externalId: 'inep:2024_1:objetiva:1',
  sourceUrl: null,
  tags: ['urgencia'],
  isAnnulled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GetObjectiveQuestion', () => {
  it('does not expose answer data before the user answers', async () => {
    const repo = {
      findQuestionById: jest.fn().mockResolvedValue(question),
      hasUserAnsweredQuestion: jest.fn().mockResolvedValue(false),
    }
    const useCase = new GetObjectiveQuestion(repo as any)

    const result = await useCase.execute({ userId: 'u1', role: 'student', questionId: 'q1' })

    expect(result.question).not.toHaveProperty('correct_alternative')
    expect(result.question).not.toHaveProperty('explanation')
  })

  it('exposes answer data after the user answers', async () => {
    const repo = {
      findQuestionById: jest.fn().mockResolvedValue(question),
      hasUserAnsweredQuestion: jest.fn().mockResolvedValue(true),
    }
    const useCase = new GetObjectiveQuestion(repo as any)

    const result = await useCase.execute({ userId: 'u1', role: 'student', questionId: 'q1' })

    expect(result.question).toMatchObject({
      correct_alternative: 'A',
      explanation: question.explanation,
    })
  })
})
