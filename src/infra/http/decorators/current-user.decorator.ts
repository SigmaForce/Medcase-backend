import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface JwtPayload {
  sub: string
  email: string
  role: string
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest()
  return request.user as JwtPayload
})
