import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'
import { createLogger } from '@certiflow/shared'
import { createOcrProvider } from './ocr'
import type { ExtractedDocument, OcrProvider, SourceKind } from './types'

const logger = createLogger('ai-worker:ingestion-pipeline')
const PDF_TEXT_MIN_LENGTH = 40

export async function extractDocumentContent(tempFilePath: string, fileUrl: string): Promise<ExtractedDocument> {
  return extractDocumentContentWithProvider(tempFilePath, fileUrl, createOcrProvider())
}

export async function extractDocumentContentWithProvider(
  tempFilePath: string,
  fileUrl: string,
  ocrProvider: OcrProvider,
): Promise<ExtractedDocument> {
  const sourceKind = detectSourceKind(fileUrl)

  if (sourceKind === 'text') {
    return {
      content: fs.readFileSync(tempFilePath, 'utf-8').trim(),
      sourceKind,
      strategy: 'native-text',
      ocrPerformed: false,
    }
  }

  if (sourceKind === 'pdf') {
    const pdfData = await pdfParse(fs.readFileSync(tempFilePath))
    const text = pdfData.text?.trim() || ''

    if (text.length >= PDF_TEXT_MIN_LENGTH) {
      return {
        content: text,
        sourceKind,
        strategy: 'native-text',
        ocrPerformed: false,
      }
    }

    logger.warn('PDF text extraction was sparse, attempting OCR fallback', { fileUrl, textLength: text.length })
    return performOcr(tempFilePath, fileUrl, sourceKind, ocrProvider)
  }

  if (sourceKind === 'image') {
    logger.info('Image input detected, attempting OCR', { fileUrl })
    return performOcr(tempFilePath, fileUrl, sourceKind, ocrProvider)
  }

  logger.warn('No extraction strategy configured for file type', { fileUrl })
  return {
    content: '',
    sourceKind,
    strategy: 'none',
    ocrPerformed: false,
  }
}

async function performOcr(
  tempFilePath: string,
  fileUrl: string,
  sourceKind: SourceKind,
  ocrProvider: OcrProvider,
): Promise<ExtractedDocument> {
  const result = await ocrProvider.extractText({ tempFilePath, fileUrl, sourceKind })

  if (!result?.text?.trim()) {
    logger.warn('OCR did not return text', { fileUrl, provider: ocrProvider.name })
    return {
      content: '',
      sourceKind,
      strategy: 'none',
      ocrPerformed: ocrProvider.name !== 'disabled',
    }
  }

  return {
    content: result.text.trim(),
    sourceKind,
    strategy: 'ocr',
    ocrPerformed: true,
    ocrProvider: result.provider,
    ocrConfidence: result.confidence,
  }
}

function detectSourceKind(fileUrl: string): SourceKind {
  const extension = path.extname(fileUrl).toLowerCase()

  if (extension === '.pdf') return 'pdf'
  if (['.txt', '.csv', '.md', '.json'].includes(extension)) return 'text'
  if (['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp', '.gif'].includes(extension)) return 'image'
  return 'unknown'
}
