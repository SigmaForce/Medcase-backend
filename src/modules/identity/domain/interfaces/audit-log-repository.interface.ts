export interface AuditLogParams {
  userId?: string
  action: string
  entity: string
  entityId?: string
  meta?: object
  ipAddress?: string
}

export interface IAuditLogRepository {
  log(params: AuditLogParams): Promise<void>
}
