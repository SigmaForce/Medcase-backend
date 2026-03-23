import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AdminGuard } from '../../../../infra/http/guards/admin.guard'
import { GetAdminCosts } from '../../application/use-cases/GetAdminCosts'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/costs')
export class CostsController {
  constructor(private readonly getAdminCosts: GetAdminCosts) {}

  @Get()
  async costs(@Query('from') from: string, @Query('to') to: string) {
    const today = new Date().toISOString().slice(0, 10)
    return this.getAdminCosts.execute({
      from: from ?? today,
      to: to ?? today,
    })
  }
}
