import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common'
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
import {
  CompleteSimulationDto,
  CreateSimulationDto,
  ListSimulationsDto,
  SaveSimulationAnswerDto,
  SyncSimulationActivityDto,
  completeSimulationSchema,
  createSimulationSchema,
  listSimulationsSchema,
  saveSimulationAnswerSchema,
  syncSimulationActivitySchema,
} from '../../application/dtos/phase1.dto'
import { CompleteObjectiveSimulation } from '../../application/use-cases/CompleteObjectiveSimulation'
import { CreateObjectiveSimulation } from '../../application/use-cases/CreateObjectiveSimulation'
import { GetObjectiveSimulation } from '../../application/use-cases/GetObjectiveSimulation'
import { ListObjectiveSimulations } from '../../application/use-cases/ListObjectiveSimulations'
import { SaveObjectiveSimulationAnswer } from '../../application/use-cases/SaveObjectiveSimulationAnswer'
import { SyncObjectiveSimulationActivity } from '../../application/use-cases/SyncObjectiveSimulationActivity'

@SkipThrottle()
@ApiTags('Objective Exam')
@ApiBearerAuth()
@Controller('objective-exam/simulations')
export class Phase1SimulationController {
  constructor(
    private readonly createSimulation: CreateObjectiveSimulation,
    private readonly listSimulations: ListObjectiveSimulations,
    private readonly getSimulation: GetObjectiveSimulation,
    private readonly saveAnswer: SaveObjectiveSimulationAnswer,
    private readonly completeSimulation: CompleteObjectiveSimulation,
    private readonly syncActivity: SyncObjectiveSimulationActivity,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar simulado da Fase 1',
    description:
      'Monta um simulado com questões aprovadas. Defaults: 100 questões, todas as dificuldades, fonte all e 5h de limite.',
  })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        question_count: { type: 'integer', default: 100, example: 100 },
        difficulty: {
          type: 'array',
          items: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          example: ['beginner', 'intermediate', 'advanced'],
        },
        source: { type: 'string', enum: ['inep', 'ai_generated', 'all'], default: 'all' },
        specialty_ids: { type: 'array', items: { type: 'integer' }, default: [] },
        timed_limit_secs: { type: 'integer', default: 18000, example: 18000 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Simulado criado com lista de questões sem gabarito.' })
  @ApiResponse({ status: 422, description: 'Questões insuficientes para os filtros (INSUFFICIENT_QUESTIONS).' })
  async create(
    @Body(new ZodValidationPipe(createSimulationSchema)) body: CreateSimulationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createSimulation.execute({
      userId: user.sub,
      questionCount: body.question_count,
      difficulty: body.difficulty,
      source: body.source,
      specialtyIds: body.specialty_ids,
      timedLimitSecs: body.timed_limit_secs,
    })
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar histórico de simulados',
    description: 'Lista simulados do usuário autenticado com nota, status, datas e duração.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (default 20, max 100)' })
  @ApiResponse({ status: 200, description: 'Histórico paginado de simulados.' })
  async list(
    @Query(new ZodValidationPipe(listSimulationsSchema)) query: ListSimulationsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listSimulations.execute({
      userId: user.sub,
      page: query.page,
      limit: query.limit,
    })
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter simulado',
    description:
      'Retorna questões na ordem do simulado. Gabarito/explicação só aparecem após finalização.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID do simulado' })
  @ApiResponse({ status: 200, description: 'Simulado encontrado.' })
  @ApiResponse({ status: 404, description: 'Simulado não encontrado.' })
  async detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getSimulation.execute({ simulationId: id, userId: user.sub })
  }

  @Post(':id/answers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Salvar resposta do simulado',
    description:
      'Salva ou atualiza a resposta de uma questão enquanto o simulado está em andamento. A última resposta vence.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID do simulado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['question_id', 'selected_alternative'],
      properties: {
        question_id: { type: 'string', format: 'uuid' },
        selected_alternative: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'], example: 'B' },
        time_spent_secs: { type: 'integer', example: 95 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Resposta salva.' })
  @ApiResponse({ status: 400, description: 'Simulado concluído, alternativa inválida ou questão fora do simulado.' })
  @ApiResponse({ status: 404, description: 'Simulado ou questão não encontrados.' })
  async answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(saveSimulationAnswerSchema)) body: SaveSimulationAnswerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.saveAnswer.execute({
      simulationId: id,
      userId: user.sub,
      questionId: body.question_id,
      selectedAlternative: body.selected_alternative,
      timeSpentSecs: body.time_spent_secs,
    })
  }

  @Post(':id/activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sincronizar tempo ativo do simulado',
    description:
      'Persiste o maior tempo ativo total enviado pelo frontend, limitado pelo tempo maximo do simulado.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID do simulado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['active_elapsed_secs'],
      properties: {
        active_elapsed_secs: { type: 'integer', minimum: 0, example: 1234 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tempo ativo sincronizado.' })
  @ApiResponse({ status: 400, description: 'Simulado concluido ou tempo invalido.' })
  @ApiResponse({ status: 403, description: 'Sem permissao para acessar este simulado.' })
  @ApiResponse({ status: 404, description: 'Simulado nao encontrado.' })
  async activity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(syncSimulationActivitySchema)) body: SyncSimulationActivityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.syncActivity.execute({
      simulationId: id,
      userId: user.sub,
      activeElapsedSecs: body.active_elapsed_secs,
    })
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar simulado',
    description:
      'Calcula nota total, percentual, agregações por especialidade/dificuldade/fonte/tag e libera gabarito.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID do simulado' })
  @ApiResponse({ status: 200, description: 'Simulado finalizado com resultado e revisão das questões.' })
  @ApiResponse({ status: 400, description: 'Simulado já finalizado.' })
  @ApiResponse({ status: 404, description: 'Simulado não encontrado.' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        active_elapsed_secs: { type: 'integer', minimum: 0, example: 1234 },
      },
    },
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(completeSimulationSchema)) body: CompleteSimulationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.completeSimulation.execute({
      simulationId: id,
      userId: user.sub,
      activeElapsedSecs: body.active_elapsed_secs,
    })
  }
}
