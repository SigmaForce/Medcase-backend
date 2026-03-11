import { ClinicalFeedback } from './clinical-feedback.vo'

const validData = {
  score_total: 78,
  correct_diagnosis: 'IAM',
  dimensions: {
    history_taking: { score: 80, analysis: 'Boa anamnese' },
    differential: { score: 75, analysis: 'Ok' },
    diagnosis: { score: 85, analysis: 'Correto' },
    exams: { score: 65, analysis: 'Faltou ECG' },
    management: { score: 85, analysis: 'Adequado' },
  },
}

describe('ClinicalFeedback', () => {
  it('creates feedback from valid data', () => {
    const fb = ClinicalFeedback.create(validData)
    expect(fb.value.score_total).toBe(78)
    expect(fb.value.correct_diagnosis).toBe('IAM')
  })

  it('throws INVALID_FEEDBACK when score_total < 0', () => {
    expect(() => ClinicalFeedback.create({ ...validData, score_total: -1 })).toThrow(
      expect.objectContaining({ code: 'INVALID_FEEDBACK' }),
    )
  })

  it('throws INVALID_FEEDBACK when score_total > 100', () => {
    expect(() => ClinicalFeedback.create({ ...validData, score_total: 101 })).toThrow(
      expect.objectContaining({ code: 'INVALID_FEEDBACK' }),
    )
  })

  it('toProResponse returns full feedback', () => {
    const fb = ClinicalFeedback.create(validData)
    const res = fb.toProResponse()
    expect(res).toHaveProperty('dimensions')
  })

  it('toFreeResponse returns only score_total and correct_diagnosis', () => {
    const fb = ClinicalFeedback.create(validData)
    const res = fb.toFreeResponse()
    expect(res).toEqual({ score_total: 78, correct_diagnosis: 'IAM' })
    expect(res).not.toHaveProperty('dimensions')
  })

  it('fromRaw creates feedback from unknown object', () => {
    const fb = ClinicalFeedback.fromRaw(validData)
    expect(fb.value.score_total).toBe(78)
  })

  it('fromRaw throws INVALID_FEEDBACK for non-object', () => {
    expect(() => ClinicalFeedback.fromRaw(null)).toThrow(
      expect.objectContaining({ code: 'INVALID_FEEDBACK' }),
    )
    expect(() => ClinicalFeedback.fromRaw('string')).toThrow(
      expect.objectContaining({ code: 'INVALID_FEEDBACK' }),
    )
  })

  it('toJSON returns the raw data', () => {
    const fb = ClinicalFeedback.create(validData)
    expect(fb.toJSON()).toEqual(validData)
  })
})
