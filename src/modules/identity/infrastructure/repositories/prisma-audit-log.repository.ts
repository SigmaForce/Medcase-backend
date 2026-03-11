import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IAuditLogRepository, AuditLogParams } from '../../domain/interfaces/audit-log-repository.interface'

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        meta: (params.meta ?? {}) as object,
        ipAddress: params.ipAddress ?? null,
      },
    })
  }
}
