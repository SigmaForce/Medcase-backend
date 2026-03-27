import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { env } from '../../../config/env'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractBearerToken(request)

    if (!token) {
      throw new UnauthorizedException({ error: 'MISSING_TOKEN' })
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: env.JWT_SECRET, algorithms: ['HS256'] })
      request['user'] = payload
    } catch {
      throw new UnauthorizedException({ error: 'INVALID_TOKEN' })
    }

    return true
  }

  private extractBearerToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : null
  }
}
