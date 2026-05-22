import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JwtPayload, UnauthorizedError, createLogger } from '@certiflow/shared'

const logger = createLogger('api-gateway:auth-middleware')

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Pull the token from the Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided')
    }

    const token = authHeader.split(' ')[1]

    // 2. Verify and decode the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JwtPayload

    // 3. Attach decoded user to request so downstream services can use it
    req.user = decoded

    // 4. Forward the userId as a header to downstream services
    req.headers['x-user-id'] = decoded.userId
    req.headers['x-user-email'] = decoded.email

    logger.info(`Authenticated request`, { userId: decoded.userId, path: req.path })

    next()
  } catch (error) {
    logger.error('Auth failed', { error })
    res.status(401).json({ success: false, error: 'Unauthorized' })
  }
}
