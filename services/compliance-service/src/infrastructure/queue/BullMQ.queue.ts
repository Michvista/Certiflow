import { Queue } from 'bullmq'
import { IQueueService } from '../../application/interfaces/queue.interface'
import { AuditJobPayload, createLogger } from '@certiflow/shared'

const logger = createLogger('compliance-service:queue')

export const AUDIT_QUEUE_NAME = 'audit-queue'

export class BullMQQueueService implements IQueueService {
  private queue: Queue

  constructor() {
    this.queue = new Queue(AUDIT_QUEUE_NAME, {
      connection: createRedisConnection(),
    })

    logger.info(`Queue connected: ${AUDIT_QUEUE_NAME}`)
  }

  async publishAuditJob(payload: AuditJobPayload): Promise<void> {
    await this.queue.add('audit-report', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    })

    logger.info('Audit job published', { reportId: payload.reportId })
  }
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
