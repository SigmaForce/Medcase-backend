import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { GetMe } from '../../application/use-cases/GetMe'
import { CompleteOnboarding } from '../../application/use-cases/CompleteOnboarding'
import { completeOnboardingSchema } from '../../application/dtos/complete-onboarding.dto'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly getMe: GetMe,
    private readonly completeOnboarding: CompleteOnboarding,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perfil do usuário', description: 'Retorna os dados do usuário autenticado.' })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário.',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        fullName: { type: 'string' },
        country: { type: 'string', nullable: true },
        university: { type: 'string', nullable: true },
        role: { type: 'string', enum: ['student', 'reviewer', 'admin'] },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.getMe.execute(user.sub)
  }

  @Patch('me/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar onboarding', description: 'Registra país e universidade do usuário após o cadastro.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string', enum: ['BR', 'PY'], example: 'BR' },
        university: { type: 'string', example: 'UFMS' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Onboarding concluído.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async onboarding(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(completeOnboardingSchema)) body: unknown,
  ) {
    const data = body as { country: string; university: string }
    return this.completeOnboarding.execute({ userId: user.sub, ...data })
  }
}
