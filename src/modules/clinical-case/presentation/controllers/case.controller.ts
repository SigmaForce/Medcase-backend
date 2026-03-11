import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ListCases } from '../../application/use-cases/ListCases'
import { GetCase } from '../../application/use-cases/GetCase'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { listCasesSchema, ListCasesDto } from '../../application/dtos/list-cases.dto'
import { ClinicalCase } from '../../domain/entities/clinical-case.entity'

const safeCaseResponse = (c: ClinicalCase) => ({
  id: c.id,
  specialtyId: c.specialtyId,
  createdById: c.createdById,
  title: c.title,
  difficulty: c.difficulty,
  language: c.language,
  countryContext: c.countryContext,
  status: c.status,
  avgRating: c.avgRating,
  totalRatings: c.totalRatings,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
})

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
export class CaseController {
  constructor(
    private readonly listCases: ListCases,
    private readonly getCase: GetCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar casos clínicos',
    description: 'Retorna casos aprovados com avaliação >= 2.0. Nunca expõe caseBrief, availableExams ou generationPrompt.',
  })
  @ApiQuery({ name: 'specialty_id', required: false, type: Number, description: 'Filtrar por especialidade' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
  @ApiQuery({ name: 'language', required: false, enum: ['pt', 'es'] })
  @ApiQuery({ name: 'country', required: false, enum: ['BR', 'PY'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (default 20, max 50)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de casos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async list(
    @Query(new ZodValidationPipe(listCasesSchema)) query: ListCasesDto,
  ) {
    const result = await this.listCases.execute({
      specialtyId: query.specialty_id,
      difficulty: query.difficulty,
      language: query.language,
      country: query.country,
      page: query.page,
      limit: query.limit,
    })

    return {
      data: result.data.map(safeCaseResponse),
      meta: result.meta,
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detalhe de um caso clínico',
    description: 'Retorna detalhes de um caso aprovado. 404 se não encontrado, 403 se não aprovado.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID do caso clínico' })
  @ApiResponse({ status: 200, description: 'Detalhes do caso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Caso não disponível.' })
  @ApiResponse({ status: 404, description: 'Caso não encontrado.' })
  async detail(@Param('id') id: string) {
    const clinicalCase = await this.getCase.execute({ id })
    return safeCaseResponse(clinicalCase)
  }
}
