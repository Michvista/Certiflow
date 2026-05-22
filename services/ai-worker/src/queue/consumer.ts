import { Worker, Job } from 'bullmq'
import { AuditJobPayload, createLogger } from '@certiflow/shared'
import { auditReport } from '../agent/auditor'
import { prisma } from '../utils/prisma'

const logger = createLogger('ai-worker:queue-consumer')

export const AUDIT_QUEUE_NAME = 'audit-queue'

export function startQueueConsumer() {
  const worker = new Worker(
    AUDIT_QUEUE_NAME,
    async (job: Job<AuditJobPayload>) => {
      const { reportId, fileUrl, projectName } = job.data

      logger.info('Job received', { reportId, jobId: job.id })

      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'ANALYZING' },
      })

      const auditResult = await auditReport(fileUrl, projectName)

      if (auditResult.violations.length > 0) {
        await prisma.violation.createMany({
          data: auditResult.violations.map((violation) => ({
            reportId,
            ruleReference: violation.ruleReference,
            severity: violation.severity,
            description: violation.description,
            suggestion: violation.suggestion,
            sector: violation.sector ?? null,
          })),
        })

        logger.info('Violations saved', {
          reportId,
          count: auditResult.violations.length,
        })
      }

      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'COMPLETE' },
      })

      logger.info('Report completed', { reportId })
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
    }
  )

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, reportId: job.data.reportId })
  })

  worker.on('failed', async (job, error) => {
    logger.error('Job failed', { jobId: job?.id, reportId: job?.data?.reportId, error: error.message })

    if (job?.data?.reportId) {
      await prisma.report.update({
        where: { id: job.data.reportId },
        data: { status: 'FAILED' },
      }).catch((updateError: unknown) => {
        logger.error('Failed to mark report as FAILED', { updateError })
      })
    }
  })

  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message })
  })

  logger.info(`Listening on ${AUDIT_QUEUE_NAME}`)

  return worker
}

function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  if (!redisUrl.startsWith('rediss://')) {
    return { url: redisUrl }
  }

  return {
    url: redisUrl,
    tls: {},
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}
