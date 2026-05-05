import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { env } from '../../../../config/env'
import { Throttle } from '@nestjs/throttler'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Public } from '../../../../infra/http/decorators/public.decorator'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { EmailThrottlerGuard } from '../../../../infra/http/guards/email-throttler.guard'
import { z } from 'zod'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'

const confirmEmailSchema = z.object({ token: z.string().min(1) })
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

@ApiTags('Auth')
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
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @ApiOperation({ summary: 'Criar conta', description: 'Registra um novo usuário na plataforma.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'fullName'],
      properties: {
        email: { type: 'string', format: 'email', example: 'joao@example.com' },
        password: { type: 'string', minLength: 8, example: 'Senha@1234' },
        fullName: { type: 'string', example: 'João da Silva' },
        country: { type: 'string', example: 'BR' },
        university: { type: 'string', example: 'UFMS' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 1 hora.' })
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
  @Throttle({ default: { limit: 50, ttl: 900000 } })
  @ApiOperation({ summary: 'Autenticar', description: 'Autentica o usuário e retorna access + refresh tokens.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'joao@example.com' },
        password: { type: 'string', example: 'Senha@1234' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticado com sucesso.',
    schema: {
      properties: {
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 15 minutos.' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = body as { email: string; password: string }
    const { accessToken, refreshToken, user } = await this.loginUser.execute({ ...data, ipAddress: req.ip })
    this.setAuthCookies(res, accessToken, refreshToken)
    return { user }
  }

  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar e-mail', description: 'Confirma o e-mail do usuário via token enviado por e-mail.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'abc123...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'E-mail confirmado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
  async confirmEmailHandler(
    @Body(new ZodValidationPipe(confirmEmailSchema)) body: unknown,
  ) {
    const { token } = body as { token: string }
    await this.confirmEmail.execute(token)
    return { message: 'E-mail confirmado com sucesso.' }
  }

  @Public()
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 120000 } })
  @ApiOperation({ summary: 'Reenviar confirmação', description: 'Reenvia o e-mail de confirmação de conta.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'joao@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Link reenviado se o e-mail existir e não estiver confirmado.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 2 minutos.' })
  async resendConfirmationHandler(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    await this.resendConfirmation.execute(body.email)
    return { message: 'Se o e-mail existir e não estiver confirmado, um novo link foi enviado.' }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens', description: 'Troca o refresh token (cookie) por um novo par de access + refresh tokens.' })
  @ApiResponse({ status: 200, description: 'Tokens renovados.' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.refresh_token ?? ''
    const { accessToken, refreshToken } = await this.refreshTokens.execute(rawToken)
    this.setAuthCookies(res, accessToken, refreshToken)
    return {}
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar sessão', description: 'Invalida o refresh token do usuário autenticado.' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutUser.execute(user.sub)
    this.clearAuthCookies(res)
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @ApiOperation({ summary: 'Solicitar reset de senha', description: 'Envia um link de redefinição de senha para o e-mail informado.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'joao@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Link enviado se o e-mail existir.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 1 hora.' })
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
  @ApiOperation({ summary: 'Redefinir senha', description: 'Redefine a senha do usuário usando o token recebido por e-mail.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { type: 'string', example: 'abc123...' },
        newPassword: { type: 'string', minLength: 8, example: 'NovaSenha@1234' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
  async resetPasswordHandler(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: unknown,
  ) {
    const data = body as { token: string; newPassword: string }
    await this.resetPassword.execute(data.token, data.newPassword)
    return { message: 'Senha alterada com sucesso.' }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = env.NODE_ENV === 'production'
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const }
    res.cookie('access_token', accessToken, { ...base, maxAge: 3600 * 1000 })
    res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 3600 * 1000 })
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
  }
}
