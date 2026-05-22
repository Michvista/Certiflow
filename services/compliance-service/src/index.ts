import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import authRoutes from './infrastructure/http/auth.routes'
import projectRoutes from './infrastructure/http/project.routes'
import routes from './infrastructure/http/routes'
import { createLogger, errorResponse } from '@certiflow/shared'
import { prisma } from './infrastructure/prisma/client'

dotenv.config()

const app = express()
const logger = createLogger('compliance-service')
const PORT = process.env.COMPLIANCE_SERVICE_PORT || 3001

app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'healthy', service: 'compliance-service', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'unhealthy', service: 'compliance-service', db: 'disconnected' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/reports', routes)

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error('Unhandled error', { error: err.message })
  const statusCode = err.statusCode || 500
  res.status(statusCode).json(errorResponse(err.message || 'Internal server error'))
})

app.listen(PORT, () => {
  logger.info(`Compliance Service running on port ${PORT}`)
})

export default app
