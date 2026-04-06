import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { GenerateCase } from '../../application/use-cases/GenerateCase'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { generateCaseSchema, GenerateCaseDto } from '../../application/dtos/generate-case.dto'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
export class CaseGenerateController {
  constructor(private readonly generateCase: GenerateCase) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Gerar caso clínico',
    description: 'Gera um caso clínico com IA (GPT-4o). Requer plano pro ou admin. Consome 1 geração.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['specialty_id', 'difficulty', 'language', 'country_context'],
      properties: {
        specialty_id: { type: 'integer', example: 1 },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        language: { type: 'string', enum: ['pt', 'es'] },
        country_context: { type: 'string', enum: ['BR', 'PY'] },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Caso gerado e enviado para revisão.' })
  @ApiResponse({ status: 400, description: 'Especialidade inválida.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Plano pro necessário (PLAN_REQUIRED).' })
  @ApiResponse({ status: 429, description: 'Limite de gerações atingido (GENERATION_LIMIT_REACHED).' })
  @ApiResponse({ status: 500, description: 'Falha na geração (GENERATION_FAILED).' })
  async generate(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(generateCaseSchema)) body: GenerateCaseDto,
  ) {
    return this.generateCase.execute({
      userId: user.sub,
      role: user.role,
      specialtyId: body.specialty_id,
      difficulty: body.difficulty,
      language: body.language,
      countryContext: body.country_context,
    })
  }
}
