import { Injectable } from '@nestjs/common'
import { Exam } from '../../../clinical-case/domain/value-objects/available-exams.vo'

export interface ExamMatchResult {
  matched: Exam[]
  notFound: string[]
}

@Injectable()
export class ExamMatchService {
  match(requestedSlugs: string[], availableExams: Record<string, unknown>): ExamMatchResult {
    const allExams: Exam[] = [
      ...((availableExams.laboratory as Exam[]) ?? []),
      ...((availableExams.imaging as Exam[]) ?? []),
      ...((availableExams.ecg as Exam[]) ?? []),
      ...((availableExams.other as Exam[]) ?? []),
    ]

    const matched: Exam[] = []
    const notFound: string[] = []

    for (const slug of requestedSlugs) {
      const exam = allExams.find((e) => e.slug === slug)
      if (exam) {
        matched.push(exam)
      } else {
        notFound.push(slug)
      }
    }

    return { matched, notFound }
  }

  buildExamContext(exams: Exam[]): string {
    if (exams.length === 0) return ''

    const lines = exams.map((e) => `- ${e.name}: ${e.result}`)
    return `\n\n[RESULTADOS DE EXAMES SOLICITADOS]\n${lines.join('\n')}\n`
  }
}
