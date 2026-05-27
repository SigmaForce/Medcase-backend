export interface SanitizedError {
  name?: string
  message: string
  code?: string
  status?: number
}

export const sanitizeError = (err: unknown): SanitizedError => {
  if (err instanceof Error) {
    const maybeError = err as Error & { code?: unknown; status?: unknown; statusCode?: unknown }
    return {
      name: err.name,
      message: err.message,
      ...(typeof maybeError.code === 'string' ? { code: maybeError.code } : {}),
      ...(typeof maybeError.status === 'number'
        ? { status: maybeError.status }
        : typeof maybeError.statusCode === 'number'
          ? { status: maybeError.statusCode }
          : {}),
    }
  }

  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>
    return {
      message: typeof record.message === 'string' ? record.message : 'Non-error object thrown',
      ...(typeof record.code === 'string' ? { code: record.code } : {}),
      ...(typeof record.status === 'number'
        ? { status: record.status }
        : typeof record.statusCode === 'number'
          ? { status: record.statusCode }
          : {}),
    }
  }

  return { message: String(err) }
}
