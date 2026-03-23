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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
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
  @Throttle({ register: { limit: 20, ttl: 3600000 } })
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
  @Throttle({ login: { limit: 50, ttl: 900000 } })
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
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 15 minutos.' })
  async login(@Body(new ZodValidationPipe(loginSchema)) body: unknown, @Req() req: Request) {
    const data = body as { email: string; password: string }
    return this.loginUser.execute({ ...data, ipAddress: req.ip })
  }

  @Public()
  @Get('confirm-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar e-mail', description: 'Confirma o e-mail do usuário via token enviado por e-mail.' })
  @ApiQuery({ name: 'token', required: true, description: 'Token de confirmação recebido por e-mail.' })
  @ApiResponse({ status: 200, description: 'E-mail confirmado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
  async confirmEmailHandler(@Query('token') token: string) {
    await this.confirmEmail.execute(token)
    return { message: 'E-mail confirmado com sucesso.' }
  }

  @Public()
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ resend: { limit: 10, ttl: 120000 } })
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
  async resendConfirmationHandler(@Body() body: { email: string }) {
    await this.resendConfirmation.execute(body.email)
    return { message: 'Se o e-mail existir e não estiver confirmado, um novo link foi enviado.' }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens', description: 'Troca o refresh token por um novo par de access + refresh tokens.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'abc123...' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados.',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado.' })
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: unknown) {
    const data = body as { refreshToken: string }
    return this.refreshTokens.execute(data.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar sessão', description: 'Invalida o refresh token do usuário autenticado.' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.logoutUser.execute(user.sub)
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ forgot: { limit: 20, ttl: 3600000 } })
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
}
