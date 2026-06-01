import { Inject, Injectable } from '@nestjs/common'
import { IObjectiveExamRepository, PerformanceAttemptRecord } from '../../domain/interfaces/objective-exam-repository.interface'

interface StatBucket {
  label: string
  correct: number
  total: number
}

const pct = (correct: number, total: number): number => {
  if (total === 0) return 0
  return Math.round((correct / total) * 10000) / 100
}

const serialize = (bucket: StatBucket) => ({
  label: bucket.label,
  correct: bucket.correct,
  total: bucket.total,
  accuracy: pct(bucket.correct, bucket.total),
})

@Injectable()
export class GetObjectivePerformance {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute({ userId }: { userId: string }) {
    const attempts = await this.repo.findPerformanceAttempts(userId)
    const correct = attempts.filter((a) => a.isCorrect).length

    const bySpecialty = this.group(attempts, (a) => String(a.question.specialtyId ?? 'general'))
    const byDifficulty = this.group(attempts, (a) => a.question.difficulty)
    const bySource = this.group(attempts, (a) => a.question.sourceType)
    const byTag = this.groupMany(attempts, (a) => a.question.tags)
    const allAreas = [...bySpecialty, ...byDifficulty, ...byTag].filter((b) => b.total > 0)
    const sortedByAccuracy = [...allAreas].sort((a, b) => pct(a.correct, a.total) - pct(b.correct, b.total))

    return {
      overall: {
        total_answered: attempts.length,
        correct,
        accuracy: pct(correct, attempts.length),
      },
      by_specialty: bySpecialty.map(serialize),
      by_difficulty: byDifficulty.map(serialize),
      by_source: bySource.map(serialize),
      by_tag: byTag.map(serialize),
      weakestAreas: sortedByAccuracy.slice(0, 5).map(serialize),
      strongestAreas: sortedByAccuracy.reverse().slice(0, 5).map(serialize),
    }
  }

  private group(
    attempts: PerformanceAttemptRecord[],
    getKey: (attempt: PerformanceAttemptRecord) => string,
  ): StatBucket[] {
    const map = new Map<string, StatBucket>()
    for (const attempt of attempts) {
      this.add(map, getKey(attempt), attempt.isCorrect)
    }
    return [...map.values()]
  }

  private groupMany(
    attempts: PerformanceAttemptRecord[],
    getKeys: (attempt: PerformanceAttemptRecord) => string[],
  ): StatBucket[] {
    const map = new Map<string, StatBucket>()
    for (const attempt of attempts) {
      for (const key of getKeys(attempt)) {
        this.add(map, key, attempt.isCorrect)
      }
    }
    return [...map.values()]
  }

  private add(map: Map<string, StatBucket>, label: string, isCorrect: boolean) {
    const bucket = map.get(label) ?? { label, correct: 0, total: 0 }
    bucket.correct += isCorrect ? 1 : 0
    bucket.total += 1
    map.set(label, bucket)
  }
}
