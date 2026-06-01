import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AdminGuard } from '../../../../infra/http/guards/admin.guard'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { ImportInepQuestionsDto, importInepQuestionsSchema } from '../../application/dtos/phase1.dto'
import { ImportInepObjectiveQuestions } from '../../application/use-cases/ImportInepObjectiveQuestions'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/objective-exam')
export class Phase1AdminController {
  constructor(private readonly importInepQuestions: ImportInepObjectiveQuestions) {}

  @Post('import-inep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Importar questões reais do INEP',
    description:
      'Rota admin para importar questões objetivas da Fase 1. Faz upsert por external_id e marca source_type como inep.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['questions'],
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'external_id',
              'source_label',
              'difficulty',
              'stem',
              'alternatives',
              'correct_alternative',
            ],
            properties: {
              external_id: { type: 'string', example: 'inep:2025_1:objetiva:1' },
              source_label: { type: 'string', example: 'Caso Real INEP 2025/1' },
              source_url: { type: 'string', example: 'https://download.inep.gov.br/...' },
              year: { type: 'integer', example: 2025 },
              edition: { type: 'string', example: '1' },
              specialty_id: { type: 'integer', nullable: true, example: 4 },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              stem: { type: 'string', example: 'Enunciado da questão...' },
              alternatives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
                    text: { type: 'string' },
                  },
                },
              },
              correct_alternative: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
              explanation: { type: 'string', nullable: true },
              tags: { type: 'array', items: { type: 'string' } },
              is_annulled: { type: 'boolean', default: false },
              status: {
                type: 'string',
                enum: ['draft', 'pending_review', 'approved', 'rejected', 'regenerating'],
                default: 'approved',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Importação concluída com contagem de criadas/atualizadas.' })
  @ApiResponse({ status: 400, description: 'Payload inválido ou alternativa inconsistente.' })
  @ApiResponse({ status: 403, description: 'Admin obrigatório.' })
  async importInep(
    @Body(new ZodValidationPipe(importInepQuestionsSchema)) body: ImportInepQuestionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.importInepQuestions.execute({ ...body, userId: user.sub })
  }
}
