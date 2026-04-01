import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { StartSession } from '../../application/use-cases/StartSession'
import { ListSessions } from '../../application/use-cases/ListSessions'
import { GetSession } from '../../application/use-cases/GetSession'
import { startSessionSchema } from '../../application/dtos/start-session.dto'

@SkipThrottle()
@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly startSession: StartSession,
    private readonly listSessions: ListSessions,
    private readonly getSession: GetSession,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar sessão clínica',
    description: 'Cria uma nova sessão de simulação clínica para o caso informado.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['case_id'],
      properties: {
        case_id: { type: 'string', format: 'uuid', example: 'uuid-do-caso' },
        is_timed: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sessão criada com sucesso.' })
  @ApiResponse({ status: 403, description: 'Limite de casos atingido ou modo temporizado requer Pro.' })
  @ApiResponse({ status: 404, description: 'Caso não encontrado.' })
  async start(
    @Body(new ZodValidationPipe(startSessionSchema)) body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = body as { case_id: string; is_timed: boolean }
    return this.startSession.execute({
      userId: user.sub,
      caseId: data.case_id,
      isTimed: data.is_timed,
    })
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar sessões',
    description: 'Retorna as sessões do usuário autenticado.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['in_progress', 'completed', 'abandoned'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de sessões.' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listSessions.execute({
      userId: user.sub,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter sessão',
    description: 'Retorna os detalhes de uma sessão com todas as mensagens.',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiResponse({ status: 200, description: 'Sessão encontrada.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar esta sessão.' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada.' })
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getSession.execute({ sessionId: id, userId: user.sub })
  }
}
