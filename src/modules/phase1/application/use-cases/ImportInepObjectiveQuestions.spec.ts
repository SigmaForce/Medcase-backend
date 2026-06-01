import { ImportInepObjectiveQuestions } from './ImportInepObjectiveQuestions'

const validQuestion = {
  stem: 'Enunciado suficientemente longo para uma questao objetiva do Revalida.',
  alternatives: [
    { key: 'A' as const, text: 'Alternativa A' },
    { key: 'B' as const, text: 'Alternativa B' },
  ],
  correct_alternative: 'A' as const,
  explanation: 'Explicacao.',
  difficulty: 'beginner' as const,
  status: 'approved' as const,
  source_label: 'Caso Real INEP 2024/1',
  year: 2024,
  edition: '1',
  external_id: 'inep:2024_1:objetiva:1',
  source_url: 'https://download.inep.gov.br/prova.pdf',
  tags: ['clinica'],
  is_annulled: false,
}

describe('ImportInepObjectiveQuestions', () => {
  it('imports questions idempotently using external_id', async () => {
    const repo = {
      upsertQuestion: jest.fn()
        .mockResolvedValueOnce({ question: { id: 'q1', externalId: validQuestion.external_id }, created: true })
        .mockResolvedValueOnce({ question: { id: 'q1', externalId: validQuestion.external_id }, created: false }),
    }
    const useCase = new ImportInepObjectiveQuestions(repo as any)

    const result = await useCase.execute({
      userId: 'admin-1',
      questions: [validQuestion, { ...validQuestion, external_id: 'inep:2024_1:objetiva:2' }],
    })

    expect(result).toMatchObject({ imported: 2, created: 1, updated: 1 })
    expect(repo.upsertQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'inep', externalId: validQuestion.external_id }),
      'admin-1',
    )
  })

  it('rejects duplicated alternative keys before writing', async () => {
    const repo = { upsertQuestion: jest.fn() }
    const useCase = new ImportInepObjectiveQuestions(repo as any)

    await expect(useCase.execute({
      userId: 'admin-1',
      questions: [{
        ...validQuestion,
        alternatives: [
          { key: 'A', text: 'A1' },
          { key: 'A', text: 'A2' },
        ],
      }],
    } as any)).rejects.toMatchObject({ code: 'DUPLICATED_ALTERNATIVE_KEY' })
    expect(repo.upsertQuestion).not.toHaveBeenCalled()
  })
})
