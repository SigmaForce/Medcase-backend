import { DomainException } from '../../../../errors/domain-exception'

export type ExamCategory = 'laboratory' | 'imaging' | 'ecg' | 'other'

export interface Exam {
  slug: string
  name: string
  result: string
  is_key: boolean
  category: ExamCategory
}

export interface ExamsMap {
  laboratory: Exam[]
  imaging: Exam[]
  ecg: Exam[]
  other: Exam[]
}

const VALID_CATEGORIES: ExamCategory[] = ['laboratory', 'imaging', 'ecg', 'other']

const validateExam = (exam: unknown, index: number): Exam => {
  if (typeof exam !== 'object' || exam === null) {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} is not an object`)
  }

  const e = exam as Record<string, unknown>

  if (typeof e.slug !== 'string' || e.slug.trim() === '') {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} missing slug`)
  }
  if (typeof e.name !== 'string' || e.name.trim() === '') {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} missing name`)
  }
  if (typeof e.result !== 'string' || e.result.trim() === '') {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} missing result`)
  }
  if (typeof e.is_key !== 'boolean') {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} missing is_key boolean`)
  }
  if (!VALID_CATEGORIES.includes(e.category as ExamCategory)) {
    throw new DomainException('INVALID_EXAM', 400, `Exam at index ${index} has invalid category`)
  }

  return {
    slug: e.slug as string,
    name: e.name as string,
    result: e.result as string,
    is_key: e.is_key as boolean,
    category: e.category as ExamCategory,
  }
}

export class AvailableExams {
  private readonly _value: ExamsMap

  private constructor(value: ExamsMap) {
    this._value = value
  }

  static create(raw: unknown): AvailableExams {
    if (typeof raw !== 'object' || raw === null) {
      throw new DomainException('INVALID_AVAILABLE_EXAMS', 400, 'Must be an object')
    }

    const r = raw as Record<string, unknown>

    const toArray = (key: string): Exam[] => {
      const arr = r[key]
      if (arr === undefined) return []
      if (!Array.isArray(arr)) {
        throw new DomainException('INVALID_AVAILABLE_EXAMS', 400, `${key} must be an array`)
      }
      return arr.map((exam, i) => validateExam(exam, i))
    }

    const laboratory = toArray('laboratory')
    const imaging = toArray('imaging')
    const ecg = toArray('ecg')
    const other = toArray('other')

    const allExams = [...laboratory, ...imaging, ...ecg, ...other]

    if (allExams.length === 0) {
      throw new DomainException('INVALID_AVAILABLE_EXAMS', 400, 'At least 1 exam required')
    }

    const keyExams = allExams.filter((e) => e.is_key)
    if (keyExams.length < 2) {
      throw new DomainException(
        'INVALID_AVAILABLE_EXAMS',
        400,
        'At least 2 exams must have is_key = true',
      )
    }

    const slugs = allExams.map((e) => e.slug)
    const uniqueSlugs = new Set(slugs)
    if (uniqueSlugs.size !== slugs.length) {
      throw new DomainException('INVALID_AVAILABLE_EXAMS', 400, 'Exam slugs must be unique')
    }

    return new AvailableExams({ laboratory, imaging, ecg, other })
  }

  get value(): ExamsMap {
    return this._value
  }

  toJSON(): ExamsMap {
    return this._value
  }
}
