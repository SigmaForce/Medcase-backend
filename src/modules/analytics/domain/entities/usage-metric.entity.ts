export type MetricOperation = 'chat' | 'generation' | 'feedback' | 'exam_extraction'

export class UsageMetric {
  id: string
  sessionId: string | null
  userId: string
  operation: MetricOperation
  model: string
  tokensInput: number
  tokensOutput: number
  latencyMs: number | null
  createdAt: Date
}
