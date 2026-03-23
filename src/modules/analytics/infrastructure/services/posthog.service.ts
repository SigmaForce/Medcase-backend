import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PostHog } from 'posthog-node'
import { env } from '../../../../config/env'

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client = new PostHog(env.POSTHOG_API_KEY, { host: env.POSTHOG_HOST })

  track(userId: string, event: string, properties?: Record<string, unknown>): void {
    try {
      this.client.capture({ distinctId: userId, event, properties })
    } catch {
      // fire-and-forget, never propagate tracking errors
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.shutdown()
  }
}
