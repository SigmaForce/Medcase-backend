import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
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
import { StartRevalidaSession } from '../../application/use-cases/StartRevalidaSession'
import { CompleteRevalidaSession } from '../../application/use-cases/CompleteRevalidaSession'
import { SendMessage } from '../../application/use-cases/SendMessage'
import { GetSession } from '../../application/use-cases/GetSession'
import { completeSessionSchema } from '../../application/dtos/complete-session.dto'
import { z } from 'zod'

const startRevalidaSchema = z.object({
  case_id: z.string().uuid(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

@ApiTags('Revalida — Sessions')
@ApiBearerAuth()
@Controller('revalida/sessions')
export class RevalidaSessionController {
  constructor(
    private readonly startRevalidaSession: StartRevalidaSession,
    private readonly completeRevalidaSession: CompleteRevalidaSession,
    private readonly sendMessage: SendMessage,
    private readonly getSession: GetSession,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar estação Revalida',
    description:
      'Cria uma sessão de simulação Revalida com cronômetro de 10 minutos e paciente com roteiro PEP. Requer plano Pro.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['case_id'],
      properties: {
        case_id: { type: 'string', format: 'uuid', example: 'uuid-do-caso-revalida' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sessão Revalida iniciada.' })
  @ApiResponse({ status: 403, description: 'Plano Pro necessário ou limite atingido.' })
  @ApiResponse({ status: 404, description: 'Caso não encontrado.' })
  @ApiResponse({ status: 422, description: 'Caso não está no formato Revalida.' })
  async start(
    @Body(new ZodValidationPipe(startRevalidaSchema)) body: { case_id: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.startRevalidaSession.execute({
      userId: user.sub,
      caseId: body.case_id,
    })
  }

  @Post(':id/message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar mensagem na estação Revalida',
    description:
      'Envia uma mensagem ao paciente simulado. Pode disparar entrega de impressos condicionais ou resposta de exame físico.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão Revalida' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', example: 'Quando a dor começou?' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Resposta do paciente ou impresso.' })
  @ApiResponse({ status: 400, description: 'Sessão não está em andamento.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async message(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: { content: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sendMessage.execute({
      sessionId: id,
      userId: user.sub,
      content: body.content,
    })
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar estação Revalida',
    description:
      'Encerra a sessão e gera avaliação baseada no PEP (Padrão Esperado de Procedimentos), item a item.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão Revalida' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['submitted_diagnosis', 'submitted_management'],
      properties: {
        submitted_diagnosis: {
          type: 'string',
          minLength: 20,
          example: 'Tuberculose pulmonar bacilífera',
        },
        submitted_management: {
          type: 'string',
          minLength: 20,
          example: 'RIPE por 6 meses, isolamento respiratório, notificação compulsória',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Feedback PEP gerado.' })
  @ApiResponse({ status: 400, description: 'Sessão já finalizada, não é uma sessão Revalida, ou diagnóstico/conduta curtos demais.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(completeSessionSchema)) body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = body as { submitted_diagnosis: string; submitted_management: string }
    return this.completeRevalidaSession.execute({
      sessionId: id,
      userId: user.sub,
      submittedDiagnosis: data.submitted_diagnosis,
      submittedManagement: data.submitted_management,
    })
  }

  @SkipThrottle()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter sessão Revalida',
    description: 'Retorna os detalhes e mensagens de uma sessão Revalida.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão Revalida' })
  @ApiResponse({ status: 200, description: 'Sessão encontrada.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getSession.execute({ sessionId: id, userId: user.sub })
  }
}
