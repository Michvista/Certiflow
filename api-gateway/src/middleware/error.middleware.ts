import { Request, Response, NextFunction } from 'express'
import { createLogger } from '@certiflow/shared'

const logger = createLogger('api-gateway:error-middleware')

// This must be the LAST middleware registered in index.ts
// Express knows it's an error handler because it has 4 params (err, req, res, next)
export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  logger.error(`Unhandled error`, {
    statusCode,
    message,
    path: req.path,
    method: req.method,
  })

  res.status(statusCode).json({
    success: false,
    error: message,
  })
}
