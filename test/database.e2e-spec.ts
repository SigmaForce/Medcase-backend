import { Test, TestingModule } from '@nestjs/testing'
import { DatabaseModule } from '../src/infra/database/database.module'
import { PrismaService } from '../src/infra/database/prisma.service'

describe('DatabaseModule (integration)', () => {
  let module: TestingModule
  let prisma: PrismaService

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile()

    await module.init()
    prisma = module.get(PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await module.close()
  })

  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 AS result`
    expect(result[0].result).toBe(1)
  })
})
