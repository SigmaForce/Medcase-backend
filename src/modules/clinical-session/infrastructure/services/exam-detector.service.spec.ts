import { ExamDetectorService } from './exam-detector.service'

describe('ExamDetectorService', () => {
  let service: ExamDetectorService

  beforeEach(() => {
    service = new ExamDetectorService()
  })

  it('detects hemograma with high confidence', () => {
    const result = service.detect('Quero solicitar um hemograma')
    expect(result.isExamRequest).toBe(true)
    expect(result.confidence).toBe('high')
  })

  it('detects troponina with high confidence', () => {
    const result = service.detect('Preciso do resultado de troponina')
    expect(result.isExamRequest).toBe(true)
    expect(result.confidence).toBe('high')
  })

  it('detects ecg with high confidence', () => {
    const result = service.detect('Vou pedir um ecg agora')
    expect(result.isExamRequest).toBe(true)
    expect(result.confidence).toBe('high')
  })

  it('detects radiografia with high confidence', () => {
    const result = service.detect('Solicitar radiografia de tórax')
    expect(result.isExamRequest).toBe(true)
    expect(result.confidence).toBe('high')
  })

  it('detects low confidence exam keyword', () => {
    const result = service.detect('Preciso de mais informações sobre os exames')
    expect(result.isExamRequest).toBe(true)
    expect(result.confidence).toBe('low')
  })

  it('does not detect exam request in normal message', () => {
    const result = service.detect('Você tem histórico de hipertensão?')
    expect(result.isExamRequest).toBe(false)
  })

  it('does not detect exam request in empty message', () => {
    const result = service.detect('')
    expect(result.isExamRequest).toBe(false)
  })

  it('handles accented characters', () => {
    const result = service.detect('Quero solicitar um laboratório')
    expect(result.isExamRequest).toBe(true)
  })
})
