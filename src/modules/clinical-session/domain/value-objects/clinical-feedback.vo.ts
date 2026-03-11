import { DomainException } from '../../../../errors/domain-exception'

export interface FeedbackDimension {
  score: number
  analysis: string
}

export interface FeedbackDimensions {
  history_taking: FeedbackDimension
  differential: FeedbackDimension
  diagnosis: FeedbackDimension
  exams: FeedbackDimension
  management: FeedbackDimension
}

export interface ClinicalFeedbackData {
  score_total: number
  correct_diagnosis: string
  dimensions: FeedbackDimensions
}

export class ClinicalFeedback {
  private readonly _value: ClinicalFeedbackData

  private constructor(value: ClinicalFeedbackData) {
    this._value = value
  }

  static create(data: ClinicalFeedbackData): ClinicalFeedback {
    if (data.score_total < 0 || data.score_total > 100) {
      throw new DomainException('INVALID_FEEDBACK', 400, 'score_total must be between 0 and 100')
    }
    return new ClinicalFeedback(data)
  }

  static fromRaw(raw: unknown): ClinicalFeedback {
    if (typeof raw !== 'object' || raw === null) {
      throw new DomainException('INVALID_FEEDBACK', 400, 'Feedback must be an object')
    }
    const r = raw as Record<string, unknown>
    return new ClinicalFeedback(r as unknown as ClinicalFeedbackData)
  }

  get value(): ClinicalFeedbackData {
    return this._value
  }

  toProResponse(): ClinicalFeedbackData {
    return this._value
  }

  toFreeResponse(): Pick<ClinicalFeedbackData, 'score_total' | 'correct_diagnosis'> {
    return {
      score_total: this._value.score_total,
      correct_diagnosis: this._value.correct_diagnosis,
    }
  }

  toJSON(): ClinicalFeedbackData {
    return this._value
  }
}
