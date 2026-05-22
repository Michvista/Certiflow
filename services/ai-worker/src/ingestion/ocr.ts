import { createLogger } from '@certiflow/shared'
import { MockOcrProvider } from './providers/MockOcr.provider'
import { NoopOcrProvider } from './providers/NoopOcr.provider'
import type { OcrProvider } from './types'

const logger = createLogger('ai-worker:ocr')

export function createOcrProvider(): OcrProvider {
  const provider = (process.env.OCR_PROVIDER || 'none').toLowerCase()

  if (provider === 'mock') {
    logger.info('Using mock OCR provider')
    return new MockOcrProvider()
  }

  logger.info('OCR provider not configured, OCR paths will be skipped', { provider })
  return new NoopOcrProvider()
}
