import dotenv from 'dotenv'
import { startQueueConsumer } from './queue/consumer'
import { loadOshaDocument } from './rag/retriever'
import { createLogger } from '@certiflow/shared'

dotenv.config()

const logger = createLogger('ai-worker')

async function main() {
  logger.info('AI worker starting')

  await loadOshaDocument()
  logger.info('OSHA document loaded')

  startQueueConsumer()
  logger.info('AI worker ready')
}

main().catch((error) => {
  logger.error('AI worker failed to start', { error })
  process.exit(1)
})
