import { Injectable } from '@nestjs/common'

export interface ExamDetectionResult {
  isExamRequest: boolean
  confidence: 'high' | 'low'
}

const EXAM_KEYWORDS = [
  'solicitar',
  'pedir',
  'quero',
  'preciso',
  'resultado',
  'exame',
  'laboratório',
  'laboratorio',
  'radiografia',
  'raio-x',
  'raio x',
  'tomografia',
  'ecg',
  'hemograma',
  'troponina',
  'glicemia',
  'ultrassom',
]

const HIGH_CONFIDENCE_KEYWORDS = [
  'hemograma',
  'troponina',
  'glicemia',
  'ecg',
  'radiografia',
  'tomografia',
  'ultrassom',
]

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

@Injectable()
export class ExamDetectorService {
  detect(content: string): ExamDetectionResult {
    const normalized = normalizeText(content)

    const matchedKeywords = EXAM_KEYWORDS.filter((kw) => normalized.includes(normalizeText(kw)))

    if (matchedKeywords.length === 0) {
      return { isExamRequest: false, confidence: 'low' }
    }

    const hasHighConfidence = HIGH_CONFIDENCE_KEYWORDS.some((kw) =>
      normalized.includes(normalizeText(kw)),
    )

    return {
      isExamRequest: true,
      confidence: hasHighConfidence ? 'high' : 'low',
    }
  }
}
