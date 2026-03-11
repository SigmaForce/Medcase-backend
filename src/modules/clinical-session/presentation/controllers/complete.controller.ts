import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { CompleteSession } from '../../application/use-cases/CompleteSession'
import { AbandonSession } from '../../application/use-cases/AbandonSession'
import { completeSessionSchema } from '../../application/dtos/complete-session.dto'

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class CompleteController {
  constructor(
    private readonly completeSession: CompleteSession,
    private readonly abandonSession: AbandonSession,
  ) {}

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar sessão',
    description: 'Submete o diagnóstico e conduta para avaliação e gera o feedback.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['submitted_diagnosis', 'submitted_management'],
      properties: {
        submitted_diagnosis: {
          type: 'string',
          minLength: 20,
          example: 'Infarto agudo do miocárdio com supradesnivelamento de ST',
        },
        submitted_management: {
          type: 'string',
          minLength: 20,
          example: 'AAS 300mg, heparina, encaminhar para hemodinâmica urgente',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sessão finalizada com feedback gerado.' })
  @ApiResponse({ status: 400, description: 'Sessão já finalizada ou diagnóstico/conduta curtos demais.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para finalizar esta sessão.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async complete(
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(completeSessionSchema)) body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = body as { submitted_diagnosis: string; submitted_management: string }
    return this.completeSession.execute({
      sessionId,
      userId: user.sub,
      submittedDiagnosis: data.submitted_diagnosis,
      submittedManagement: data.submitted_management,
    })
  }

  @Patch(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Abandonar sessão',
    description: 'Marca a sessão como abandonada.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiResponse({ status: 200, description: 'Sessão abandonada.' })
  @ApiResponse({ status: 400, description: 'Sessão já finalizada.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para abandonar esta sessão.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async abandon(@Param('id') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.abandonSession.execute({ sessionId, userId: user.sub })
  }
}
