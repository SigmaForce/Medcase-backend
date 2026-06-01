import { ObjectiveQuestion } from '../entities/objective-question.entity'

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const bucketKey = (question: ObjectiveQuestion): string => {
  return `${question.difficulty}:${question.specialtyId ?? 'general'}`
}

export class ObjectiveQuestionSelectorService {
  select(questions: ObjectiveQuestion[], count: number): ObjectiveQuestion[] {
    const buckets = new Map<string, ObjectiveQuestion[]>()

    for (const question of shuffle(questions)) {
      const key = bucketKey(question)
      buckets.set(key, [...(buckets.get(key) ?? []), question])
    }

    const selected: ObjectiveQuestion[] = []
    const keys = shuffle([...buckets.keys()])

    while (selected.length < count && keys.length > 0) {
      let pickedInRound = false

      for (const key of keys) {
        if (selected.length >= count) break
        const bucket = buckets.get(key) ?? []
        const next = bucket.shift()
        if (!next) continue
        selected.push(next)
        pickedInRound = true
      }

      if (!pickedInRound) break
    }

    return selected
  }
}
