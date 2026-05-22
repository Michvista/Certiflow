import * as fs from 'fs'
import * as vision from '@google-cloud/vision'
import { createLogger } from '@certiflow/shared'
import type { OcrProvider, OcrResult, SourceKind } from '../types'
const logger = createLogger('ai-worker:google-vision-ocr')

export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = 'google-vision'
  private readonly credentialInfo = resolveCredentialInfo()
  private readonly client = createVisionClient(this.credentialInfo)

  constructor() {
    logger.info('Google Vision OCR credential context', {
      credentialSource: this.credentialInfo.source,
      serviceAccountEmail: this.credentialInfo.clientEmail,
    })
  }

  async extractText(input: { tempFilePath: string; fileUrl: string; sourceKind: SourceKind }): Promise<OcrResult | null> {
    if (input.sourceKind === 'image') {
      return this.extractImageText(input.tempFilePath)
    }

    if (input.sourceKind === 'pdf') {
      return this.extractPdfText(input.tempFilePath)
    }

    return null
  }

  private async extractImageText(tempFilePath: string): Promise<OcrResult | null> {
    const [result] = await this.client.documentTextDetection({
      image: { content: fs.readFileSync(tempFilePath) },
    })
    const document = result.fullTextAnnotation
    const text = document?.text?.trim() || result.textAnnotations?.[0]?.description?.trim() || ''

    if (!text) {
      return null
    }

    return {
      text,
      confidence: averageConfidence(normalizePages(document?.pages)),
      provider: this.name,
    }
  }

  private async extractPdfText(tempFilePath: string): Promise<OcrResult | null> {
    const [result] = await this.client.batchAnnotateFiles({
      requests: [
        {
          inputConfig: {
            mimeType: 'application/pdf',
            content: fs.readFileSync(tempFilePath),
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    })

    const pages = normalizeAnnotateResponses(result.responses?.[0]?.responses)
    const texts = pages
      .map((page) => page.fullTextAnnotation?.text?.trim() || '')
      .filter(Boolean)

    if (texts.length === 0) {
      return null
    }

    return {
      text: texts.join('\n\n'),
      confidence: averageConfidence(
        pages.flatMap((page) => normalizePages(page.fullTextAnnotation?.pages)),
      ),
      provider: this.name,
    }
  }
}

function averageConfidence(pages?: Array<{ confidence?: number }>): number | undefined {
  const values = (pages || []).map((page) => page.confidence).filter((value): value is number => typeof value === 'number')
  if (values.length === 0) {
    return undefined
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizePages(pages?: Array<{ confidence?: number | null } | null> | null): Array<{ confidence?: number }> {
  return (pages || [])
    .filter((page): page is { confidence?: number | null } => Boolean(page))
    .map((page) => ({
      confidence: page.confidence ?? undefined,
    }))
}

function normalizeAnnotateResponses(
  responses?: Array<{ fullTextAnnotation?: { text?: string | null; pages?: Array<{ confidence?: number | null } | null> | null } | null } | null> | null,
) {
  return (responses || []).filter(
    (response): response is { fullTextAnnotation?: { text?: string | null; pages?: Array<{ confidence?: number | null } | null> | null } | null } => Boolean(response),
  )
}

function parseInlineCredentials(value: string): { client_email?: string; private_key?: string } {
  try {
    return JSON.parse(value)
  } catch {
    return JSON.parse(value.replace(/\\n/g, '\n'))
  }
}

function resolveCredentialInfo() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8')) as {
      client_email?: string
    }

    return {
      source: 'keyFilename',
      keyFilename: credentialsPath,
      clientEmail: credentials.client_email,
    }
  }

  const inlineCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  if (inlineCredentials) {
    try {
      const credentials = parseInlineCredentials(inlineCredentials) as { client_email?: string }
      return {
        source: 'inlineJson',
        keyFilename: undefined,
        clientEmail: credentials.client_email,
      }
    } catch {
      return {
        source: 'inlineJson',
        keyFilename: undefined,
        clientEmail: undefined,
      }
    }
  }

  return {
    source: 'defaultCredentials',
    keyFilename: undefined,
    clientEmail: undefined,
  }
}

function createVisionClient(credentialInfo: ReturnType<typeof resolveCredentialInfo>) {
  if (credentialInfo.source === 'keyFilename' && credentialInfo.keyFilename) {
    return new vision.ImageAnnotatorClient({
      keyFilename: credentialInfo.keyFilename,
      projectId: process.env.GOOGLE_CLOUD_QUOTA_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim(),
    })
  }

  const inlineCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  if (credentialInfo.source === 'inlineJson' && inlineCredentials) {
    return new vision.ImageAnnotatorClient({
      credentials: parseInlineCredentials(inlineCredentials),
      projectId: process.env.GOOGLE_CLOUD_QUOTA_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim(),
    })
  }

  return new vision.ImageAnnotatorClient()
}
