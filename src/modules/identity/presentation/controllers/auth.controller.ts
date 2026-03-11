import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../../../infra/http/decorators/public.decorator'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { EmailThrottlerGuard } from '../../../../infra/http/guards/email-throttler.guard'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { RegisterUser } from '../../application/use-cases/RegisterUser'
import { LoginUser } from '../../application/use-cases/LoginUser'
import { RefreshTokens } from '../../application/use-cases/RefreshTokens'
import { LogoutUser } from '../../application/use-cases/LogoutUser'
import { ConfirmEmail } from '../../application/use-cases/ConfirmEmail'
import { ResendConfirmation } from '../../application/use-cases/ResendConfirmation'
import { ForgotPassword } from '../../application/use-cases/ForgotPassword'
import { ResetPassword } from '../../application/use-cases/ResetPassword'
import { registerUserSchema } from '../../application/dtos/register-user.dto'
import { loginSchema } from '../../application/dtos/login.dto'
import { refreshTokenSchema } from '../../application/dtos/refresh-token.dto'
import { forgotPasswordSchema } from '../../application/dtos/forgot-password.dto'
import { resetPasswordSchema } from '../../application/dtos/reset-password.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly refreshTokens: RefreshTokens,
    private readonly logoutUser: LogoutUser,
    private readonly confirmEmail: ConfirmEmail,
    private readonly resendConfirmation: ResendConfirmation,
    private readonly forgotPassword: ForgotPassword,
    private readonly resetPassword: ResetPassword,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ register: { limit: 3, ttl: 3600000 } })
  async register(
    @Body(new ZodValidationPipe(registerUserSchema)) body: unknown,
    @Req() req: Request,
  ) {
    const data = body as {
      email: string
      password: string
      fullName: string
      country: string
      university: string
    }
    return this.registerUser.execute({ ...data, ipAddress: req.ip })
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  async login(@Body(new ZodValidationPipe(loginSchema)) body: unknown, @Req() req: Request) {
    const data = body as { email: string; password: string }
    return this.loginUser.execute({ ...data, ipAddress: req.ip })
  }

  @Public()
  @Get('confirm-email')
  @HttpCode(HttpStatus.OK)
  async confirmEmailHandler(@Query('token') token: string) {
    await this.confirmEmail.execute(token)
    return { message: 'E-mail confirmado com sucesso.' }
  }

  @Public()
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ resend: { limit: 1, ttl: 120000 } })
  async resendConfirmationHandler(@Body() body: { email: string }) {
    await this.resendConfirmation.execute(body.email)
    return { message: 'Se o e-mail existir e não estiver confirmado, um novo link foi enviado.' }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: unknown) {
    const data = body as { refreshToken: string }
    return this.refreshTokens.execute(data.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.logoutUser.execute(user.sub)
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ forgot: { limit: 3, ttl: 3600000 } })
  async forgotPasswordHandler(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: unknown,
  ) {
    const data = body as { email: string }
    await this.forgotPassword.execute(data.email)
    return { message: 'Se o e-mail existir, você receberá o link em breve.' }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPasswordHandler(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: unknown,
  ) {
    const data = body as { token: string; newPassword: string }
    await this.resetPassword.execute(data.token, data.newPassword)
    return { message: 'Senha alterada com sucesso.' }
  }
}
