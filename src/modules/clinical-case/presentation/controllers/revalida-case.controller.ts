import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import {
  GenerateRevalidaCase,
  generateRevalidaCaseSchema,
  GenerateRevalidaCaseDto,
} from '../../application/use-cases/GenerateRevalidaCase'

@ApiTags('Revalida — Cases')
@ApiBearerAuth()
@Controller('revalida/cases')
export class RevalidaCaseController {
  constructor(private readonly generateRevalidaCase: GenerateRevalidaCase) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gerar estação Revalida',
    description:
      'Gera um caso clínico no formato de estação prática do Revalida (PEP + roteiro de paciente). Requer plano Pro ou Institutional.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['specialty_id', 'difficulty', 'language', 'country_context'],
      properties: {
        specialty_id: { type: 'integer', example: 1 },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], example: 'intermediate' },
        language: { type: 'string', enum: ['pt', 'es'], example: 'pt' },
        country_context: { type: 'string', enum: ['BR', 'PY'], example: 'BR' },
        attention_level: {
          type: 'string',
          enum: ['primaria', 'secundaria', 'terciaria'],
          example: 'primaria',
          description: 'Nível de atenção da estação (primária=UBS, secundária=hospital médio porte)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Estação gerada e submetida para revisão.' })
  @ApiResponse({ status: 400, description: 'Especialidade inválida.' })
  @ApiResponse({ status: 403, description: 'Plano Pro ou Institutional necessário.' })
  @ApiResponse({ status: 429, description: 'Limite de gerações atingido.' })
  async generate(
    @Body(new ZodValidationPipe(generateRevalidaCaseSchema)) body: GenerateRevalidaCaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.generateRevalidaCase.execute({
      userId: user.sub,
      role: user.role,
      specialtyId: body.specialty_id,
      difficulty: body.difficulty,
      language: body.language,
      countryContext: body.country_context,
      attentionLevel: body.attention_level,
    })
  }
}
