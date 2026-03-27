import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { ITransactionManager } from '../../domain/interfaces/transaction-manager.interface'

@Injectable()
export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn)
  }
}
