import { ObjectiveQuestion } from '../entities/objective-question.entity'
import { ObjectiveQuestionSelectorService } from './objective-question-selector.service'

const question = (id: string, difficulty: ObjectiveQuestion['difficulty'], specialtyId: number): ObjectiveQuestion => ({
  id,
  specialtyId,
  createdById: null,
  stem: id,
  alternatives: [
    { key: 'A', text: 'A' },
    { key: 'B', text: 'B' },
  ],
  correctAlternative: 'A',
  explanation: null,
  difficulty,
  status: 'approved',
  sourceType: 'inep',
  sourceLabel: 'INEP',
  year: 2024,
  edition: '1',
  externalId: id,
  sourceUrl: null,
  tags: [],
  isAnnulled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('ObjectiveQuestionSelectorService', () => {
  it('selects without repeating questions and spreads across buckets', () => {
    const service = new ObjectiveQuestionSelectorService()
    const selected = service.select([
      question('q1', 'beginner', 1),
      question('q2', 'beginner', 1),
      question('q3', 'intermediate', 2),
      question('q4', 'advanced', 3),
    ], 3)

    expect(new Set(selected.map((q) => q.id)).size).toBe(3)
    expect(selected).toHaveLength(3)
  })
})
