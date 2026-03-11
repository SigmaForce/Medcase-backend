import { ExamMatchService } from './exam-match.service'

const availableExams = {
  laboratory: [
    { slug: 'hemograma', name: 'Hemograma Completo', result: 'Normal', is_key: true, category: 'laboratory' },
    { slug: 'troponina', name: 'Troponina I', result: 'Elevado', is_key: true, category: 'laboratory' },
    { slug: 'glicemia', name: 'Glicemia', result: '110 mg/dL', is_key: false, category: 'laboratory' },
  ],
  imaging: [
    { slug: 'rx-torax', name: 'Raio-X de Tórax', result: 'Sem alterações', is_key: false, category: 'imaging' },
  ],
  ecg: [
    { slug: 'ecg', name: 'Eletrocardiograma', result: 'Supra ST em V1-V4', is_key: true, category: 'ecg' },
  ],
  other: [],
}

describe('ExamMatchService', () => {
  let service: ExamMatchService

  beforeEach(() => {
    service = new ExamMatchService()
  })

  it('matches requested slugs to exam records', () => {
    const result = service.match(['hemograma', 'troponina'], availableExams)
    expect(result.matched).toHaveLength(2)
    expect(result.matched[0].slug).toBe('hemograma')
    expect(result.matched[1].slug).toBe('troponina')
    expect(result.notFound).toEqual([])
  })

  it('returns notFound for unrecognized slugs', () => {
    const result = service.match(['hemograma', 'ultrassom-renal'], availableExams)
    expect(result.matched).toHaveLength(1)
    expect(result.notFound).toEqual(['ultrassom-renal'])
  })

  it('returns empty matched for empty slugs', () => {
    const result = service.match([], availableExams)
    expect(result.matched).toEqual([])
    expect(result.notFound).toEqual([])
  })

  it('builds exam context string correctly', () => {
    const exams = availableExams.laboratory.slice(0, 2)
    const context = service.buildExamContext(exams as never)
    expect(context).toContain('[RESULTADOS DE EXAMES SOLICITADOS]')
    expect(context).toContain('Hemograma Completo')
    expect(context).toContain('Troponina I')
  })

  it('returns empty string for empty exam list', () => {
    const context = service.buildExamContext([])
    expect(context).toBe('')
  })

  it('matches exams across all categories', () => {
    const result = service.match(['hemograma', 'ecg', 'rx-torax'], availableExams)
    expect(result.matched).toHaveLength(3)
  })
})
