import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../decorators/public.decorator'
import { PrismaService } from '../../database/prisma.service'

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Verifica status da aplicação e conexão com o banco.' })
  @ApiResponse({ status: 200, description: 'Aplicação saudável.' })
  async check() {
    let db: 'ok' | 'error' = 'ok'
    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      db = 'error'
    }
    return { status: 'ok', db, timestamp: new Date().toISOString() }
  }
}
