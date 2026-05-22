import { ApiResponse } from '../types'
import winston from 'winston'

type LogMeta = Record<string, unknown> | undefined

export function createLogger(serviceName: string) {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['level', 'message', 'timestamp', 'service'] }),
      winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
  })

  return {
    info: (message: string, meta?: LogMeta) => logger.info(message, meta),
    warn: (message: string, meta?: LogMeta) => logger.warn(message, meta),
    error: (message: string, meta?: LogMeta) => logger.error(message, meta),
    debug: (message: string, meta?: LogMeta) => logger.debug(message, meta),
  }
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function errorResponse(error: string, errors?: Record<string, string[]>): ApiResponse {
  return { success: false, error, errors }
}

export class NotFoundError extends Error {
  public statusCode = 404

  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  public statusCode = 400

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  public statusCode = 401

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ServiceUnavailableError extends Error {
  public statusCode = 503

  constructor(service: string) {
    super(`${service} is currently unavailable`)
    this.name = 'ServiceUnavailableError'
  }
}
