import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { GetMe } from '../../application/use-cases/GetMe'
import { CompleteOnboarding } from '../../application/use-cases/CompleteOnboarding'
import { GetPerformance } from '../../application/use-cases/GetPerformance'
import { GetPerformanceBySpecialty } from '../../application/use-cases/GetPerformanceBySpecialty'
import { GetStats } from '../../application/use-cases/GetStats'
import { UpdateProfile } from '../../application/use-cases/UpdateProfile'
import { completeOnboardingSchema } from '../../application/dtos/complete-onboarding.dto'
import { updateProfileSchema } from '../../application/dtos/update-profile.dto'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly getMe: GetMe,
    private readonly completeOnboarding: CompleteOnboarding,
    private readonly getPerformance: GetPerformance,
    private readonly getPerformanceBySpecialty: GetPerformanceBySpecialty,
    private readonly getStats: GetStats,
    private readonly updateProfile: UpdateProfile,
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

  @Get('me/performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dashboard de performance', description: 'Retorna performance do aluno por especialidade.' })
  async performance(@CurrentUser() user: JwtPayload) {
    return this.getPerformance.execute({ userId: user.sub })
  }

  @Get('me/performance/:specialty_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Performance por especialidade', description: 'Detalhe de performance em uma especialidade.' })
  async performanceBySpecialty(
    @Param('specialty_id', ParseIntPipe) specialtyId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getPerformanceBySpecialty.execute({ userId: user.sub, specialtyId })
  }

  @Get('me/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estatísticas e conquistas', description: 'Retorna streak, badges e totais do aluno.' })
  async stats(@CurrentUser() user: JwtPayload) {
    return this.getStats.execute({ userId: user.sub })
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar perfil', description: 'Atualiza dados do perfil do usuário autenticado.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', example: 'João Silva' },
        country: { type: 'string', enum: ['BR', 'PY'], example: 'BR' },
        university: { type: 'string', example: 'UFMS' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Perfil atualizado.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: unknown,
  ) {
    return this.updateProfile.execute({ userId: user.sub, body })
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
