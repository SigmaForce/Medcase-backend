import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { Request } from 'express'

@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    return (req.body?.email as string) ?? req.ip ?? 'unknown'
  }
}
