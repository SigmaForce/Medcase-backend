import { ClinicalCase } from './clinical-case.entity'

const makeProps = () => ({
  id: 'case-uuid-1',
  specialtyId: 1,
  createdById: 'user-uuid-1',
  title: 'Paciente com dor no peito',
  difficulty: 'intermediate' as const,
  language: 'pt' as const,
  countryContext: 'BR' as const,
  caseBrief: { diagnosis: 'IAM' },
  availableExams: { laboratory: [] },
})

describe('ClinicalCase', () => {
  it('creates a clinical case with all props', () => {
    const c = ClinicalCase.create(makeProps())
    expect(c.id).toBe('case-uuid-1')
    expect(c.specialtyId).toBe(1)
    expect(c.title).toBe('Paciente com dor no peito')
    expect(c.difficulty).toBe('intermediate')
    expect(c.language).toBe('pt')
    expect(c.countryContext).toBe('BR')
  })

  it('defaults status to pending_review', () => {
    const c = ClinicalCase.create(makeProps())
    expect(c.status).toBe('pending_review')
  })

  it('respects provided status', () => {
    const c = ClinicalCase.create({ ...makeProps(), status: 'approved' })
    expect(c.status).toBe('approved')
  })

  it('defaults reviewedById to null', () => {
    const c = ClinicalCase.create(makeProps())
    expect(c.reviewedById).toBeNull()
  })

  it('defaults numeric counters to 0', () => {
    const c = ClinicalCase.create(makeProps())
    expect(c.avgRating).toBe(0)
    expect(c.totalRatings).toBe(0)
    expect(c.flaggedCount).toBe(0)
  })

  it('sets createdAt and updatedAt', () => {
    const c = ClinicalCase.create(makeProps())
    expect(c.createdAt).toBeInstanceOf(Date)
    expect(c.updatedAt).toBeInstanceOf(Date)
  })
})
