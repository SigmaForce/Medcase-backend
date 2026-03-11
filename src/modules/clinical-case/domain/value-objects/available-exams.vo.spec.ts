import { AvailableExams } from './available-exams.vo'
import { DomainException } from '../../../../errors/domain-exception'

const makeValidExamsRaw = () => ({
  laboratory: [
    { slug: 'hemograma', name: 'Hemograma completo', result: 'Normal', is_key: true, category: 'laboratory' },
    { slug: 'pcr', name: 'PCR', result: 'Elevado', is_key: true, category: 'laboratory' },
  ],
  imaging: [],
  ecg: [],
  other: [],
})

describe('AvailableExams', () => {
  it('creates valid exams', () => {
    const vo = AvailableExams.create(makeValidExamsRaw())
    expect(vo.value.laboratory).toHaveLength(2)
    expect(vo.value.imaging).toHaveLength(0)
  })

  it('throws INVALID_AVAILABLE_EXAMS when not an object', () => {
    expect(() => AvailableExams.create(null)).toThrow(
      expect.objectContaining({ code: 'INVALID_AVAILABLE_EXAMS' }),
    )
    expect(() => AvailableExams.create('string')).toThrow(DomainException)
  })

  it('throws when there are no exams at all', () => {
    expect(() =>
      AvailableExams.create({ laboratory: [], imaging: [], ecg: [], other: [] }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_AVAILABLE_EXAMS' }))
  })

  it('throws when fewer than 2 key exams', () => {
    const raw = makeValidExamsRaw()
    raw.laboratory[1].is_key = false
    expect(() => AvailableExams.create(raw)).toThrow(
      expect.objectContaining({ code: 'INVALID_AVAILABLE_EXAMS' }),
    )
  })

  it('throws when slugs are not unique', () => {
    const raw = makeValidExamsRaw()
    raw.laboratory[1].slug = 'hemograma'
    expect(() => AvailableExams.create(raw)).toThrow(
      expect.objectContaining({ code: 'INVALID_AVAILABLE_EXAMS' }),
    )
  })

  it('throws when an exam is missing required fields', () => {
    const raw = {
      laboratory: [{ slug: 'hemograma', name: 'Hemograma', is_key: true, category: 'laboratory' }],
      imaging: [],
      ecg: [],
      other: [],
    }
    expect(() => AvailableExams.create(raw)).toThrow(DomainException)
  })

  it('toJSON returns the exams map', () => {
    const vo = AvailableExams.create(makeValidExamsRaw())
    const json = vo.toJSON()
    expect(json.laboratory).toHaveLength(2)
  })
})
