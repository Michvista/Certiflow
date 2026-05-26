import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authMiddleware } from './middleware/auth.middleware'
import { errorMiddleware } from './middleware/error.middleware'
import { createLogger } from '@certiflow/shared'

dotenv.config()

const app = express()
const logger = createLogger('api-gateway')
const PORT = process.env.GATEWAY_PORT || 3000

const COMPLIANCE_SERVICE_URL = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3001'
const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:3002'

const proxyToCompliance = (prefix: string) =>
  createProxyMiddleware({
    target: COMPLIANCE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `${prefix}${path}`,
  })

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(morgan('combined'))

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      compliance: COMPLIANCE_SERVICE_URL,
      aiWorker: AI_WORKER_URL,
    },
  })
})

app.use(
  '/api/auth',
  proxyToCompliance('/api/auth')
)

app.use(
  '/api/projects',
  authMiddleware,
  proxyToCompliance('/api/projects')
)

app.use(
  '/api/reports',
  authMiddleware,
  proxyToCompliance('/api/reports')
)

app.use(
  '/api/violations',
  authMiddleware,
  proxyToCompliance('/api/violations')
)

app.use(errorMiddleware)

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`)
  logger.info(`Proxying /api/projects to ${COMPLIANCE_SERVICE_URL}`)
  logger.info(`Proxying /api/reports to ${COMPLIANCE_SERVICE_URL}`)
  logger.info(`AI Worker available at ${AI_WORKER_URL}`)
})

export default app
