import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
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
import { SendMessage } from '../../application/use-cases/SendMessage'
import { sendMessageSchema } from '../../application/dtos/send-message.dto'

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions/:id/messages')
export class MessageController {
  constructor(private readonly sendMessage: SendMessage) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Enviar mensagem',
    description: 'Envia uma mensagem para o paciente virtual na sessão.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', example: 'Há quanto tempo você está com dor de cabeça?' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Mensagem enviada e resposta do paciente.' })
  @ApiResponse({ status: 400, description: 'Sessão já finalizada, mensagem vazia ou limite atingido.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para enviar mensagem nesta sessão.' })
  async send(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = body as { content: string }
    return this.sendMessage.execute({
      sessionId,
      userId: user.sub,
      content: data.content,
    })
  }
}
