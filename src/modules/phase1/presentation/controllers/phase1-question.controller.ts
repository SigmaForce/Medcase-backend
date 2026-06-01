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
  AnswerObjectiveQuestionDto,
  ListObjectiveQuestionsDto,
  answerObjectiveQuestionSchema,
  listObjectiveQuestionsSchema,
} from '../../application/dtos/phase1.dto'
import { AnswerObjectiveQuestion } from '../../application/use-cases/AnswerObjectiveQuestion'
import { GetObjectivePerformance } from '../../application/use-cases/GetObjectivePerformance'
import { GetObjectiveQuestion } from '../../application/use-cases/GetObjectiveQuestion'
import { ListObjectiveQuestions } from '../../application/use-cases/ListObjectiveQuestions'

@SkipThrottle()
@ApiTags('Objective Exam')
@ApiBearerAuth()
@Controller('objective-exam')
export class Phase1QuestionController {
  constructor(
    private readonly listQuestions: ListObjectiveQuestions,
    private readonly getQuestion: GetObjectiveQuestion,
    private readonly answerQuestion: AnswerObjectiveQuestion,
    private readonly getPerformance: GetObjectivePerformance,
  ) {}

  @Get('questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar questões objetivas da Fase 1',
    description: 'Lista questões aprovadas. Não expõe gabarito nem explicação antes da resposta do aluno.',
  })
  @ApiQuery({ name: 'specialty_id', required: false, type: Number, description: 'Filtrar por especialidade' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
  @ApiQuery({ name: 'source', required: false, enum: ['inep', 'ai_generated', 'all'], description: 'Fonte da questão (default all)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Ano da prova INEP' })
  @ApiQuery({ name: 'edition', required: false, type: String, description: 'Edição da prova, ex. 1 ou 2' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Tag clínica/tópico' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (default 20, max 100)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de questões sem gabarito.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async list(
    @Query(new ZodValidationPipe(listObjectiveQuestionsSchema)) query: ListObjectiveQuestionsDto,
  ) {
    return this.listQuestions.execute({
      specialtyId: query.specialty_id,
      difficulty: query.difficulty,
      source: query.source,
      year: query.year,
      edition: query.edition,
      tag: query.tag,
      page: query.page,
      limit: query.limit,
    })
  }

  @Get('questions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detalhar questão objetiva',
    description: 'Expõe gabarito/explicação somente após o usuário responder, ou para admin/reviewer.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da questão objetiva' })
  @ApiResponse({ status: 200, description: 'Questão encontrada.' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada ou indisponível.' })
  async detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getQuestion.execute({
      questionId: id,
      userId: user.sub,
      role: user.role,
    })
  }

  @Post('questions/:id/answer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Responder questão avulsa',
    description: 'Registra tentativa fora de simulado e retorna acerto, gabarito e explicação.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da questão objetiva' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['selected_alternative'],
      properties: {
        selected_alternative: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'], example: 'C' },
        time_spent_secs: { type: 'integer', example: 80 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Resposta registrada com gabarito e explicação.' })
  @ApiResponse({ status: 400, description: 'Alternativa inválida.' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada.' })
  async answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(answerObjectiveQuestionSchema)) body: AnswerObjectiveQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.answerQuestion.execute({
      userId: user.sub,
      questionId: id,
      selectedAlternative: body.selected_alternative,
      timeSpentSecs: body.time_spent_secs,
    })
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar performance objetiva da Fase 1',
    description: 'Retorna acurácia geral, por especialidade, dificuldade, fonte e tags, além de pontos fortes/fracos.',
  })
  @ApiResponse({ status: 200, description: 'Performance agregada do aluno.' })
  async performance(@CurrentUser() user: JwtPayload) {
    return this.getPerformance.execute({ userId: user.sub })
  }
}
