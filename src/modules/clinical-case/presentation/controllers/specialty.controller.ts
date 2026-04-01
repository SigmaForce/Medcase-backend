import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { ListSpecialties } from '../../application/use-cases/ListSpecialties'

@SkipThrottle()
@ApiTags('Specialties')
@ApiBearerAuth()
@Controller('specialties')
export class SpecialtyController {
  constructor(private readonly listSpecialties: ListSpecialties) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar especialidades',
    description: 'Retorna todas as especialidades médicas disponíveis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de especialidades.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          slug: { type: 'string' },
          name_pt: { type: 'string' },
          name_es: { type: 'string' },
          icon: { type: 'string', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async list() {
    const specialties = await this.listSpecialties.execute()
    return specialties.map((s) => ({
      id: s.id,
      slug: s.slug,
      name_pt: s.namePt,
      name_es: s.nameEs,
      icon: s.icon,
    }))
  }
}
