export interface IAnalyticsService {
  track(userId: string, event: string, props?: Record<string, unknown>): void
}
