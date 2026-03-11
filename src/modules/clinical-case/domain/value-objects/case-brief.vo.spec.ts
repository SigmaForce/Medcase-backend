import { CaseBrief } from './case-brief.vo'
import { DomainException } from '../../../../errors/domain-exception'

const makeValidBriefRaw = () => ({
  diagnosis: 'Pneumonia bacteriana',
  differential: ['Tuberculose pulmonar', 'Derrame pleural'],
  expected_management: 'Antibioticoterapia com amoxicilina por 7 dias',
  key_findings: ['Consolidação em base direita'],
  teaching_points: ['Sinais de alarme para internação'],
})

describe('CaseBrief', () => {
  it('creates a valid case brief', () => {
    const brief = CaseBrief.create(makeValidBriefRaw())
    expect(brief.value.diagnosis).toBe('Pneumonia bacteriana')
    expect(brief.value.differential).toHaveLength(2)
  })

  it('throws INVALID_CASE_BRIEF when not an object', () => {
    expect(() => CaseBrief.create(null)).toThrow(
      expect.objectContaining({ code: 'INVALID_CASE_BRIEF' }),
    )
  })

  it('throws when diagnosis is missing', () => {
    const raw = { ...makeValidBriefRaw(), diagnosis: '' }
    expect(() => CaseBrief.create(raw)).toThrow(DomainException)
  })

  it('throws when differential has fewer than 2 items', () => {
    const raw = { ...makeValidBriefRaw(), differential: ['only one'] }
    expect(() => CaseBrief.create(raw)).toThrow(
      expect.objectContaining({ code: 'INVALID_CASE_BRIEF' }),
    )
  })

  it('throws when expected_management is missing', () => {
    const raw = { ...makeValidBriefRaw(), expected_management: '' }
    expect(() => CaseBrief.create(raw)).toThrow(DomainException)
  })

  it('sets optional fields to empty arrays when absent', () => {
    const raw = {
      diagnosis: 'Diagnóstico',
      differential: ['D1', 'D2'],
      expected_management: 'Conduta',
    }
    const brief = CaseBrief.create(raw)
    expect(brief.value.key_findings).toEqual([])
    expect(brief.value.teaching_points).toEqual([])
  })

  it('toJSON returns the data', () => {
    const brief = CaseBrief.create(makeValidBriefRaw())
    expect(brief.toJSON().diagnosis).toBe('Pneumonia bacteriana')
  })
})
