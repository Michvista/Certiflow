import * as fs from 'fs'
import { GoogleAuth } from 'google-auth-library'
import type { OcrProvider, OcrResult, SourceKind } from '../types'

type AnnotateImageResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string
      pages?: Array<{ confidence?: number }>
    }
    textAnnotations?: Array<{ description?: string }>
  }>
}

type AnnotateFileResponse = {
  responses?: Array<{
    responses?: Array<{
      fullTextAnnotation?: {
        text?: string
        pages?: Array<{ confidence?: number }>
      }
    }>
  }>
}

const VISION_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = 'google-vision'
  private readonly auth = createGoogleAuth()

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
    const body = {
      requests: [
        {
          image: { content: fs.readFileSync(tempFilePath).toString('base64') },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    }

    const response = await this.postJson<AnnotateImageResponse>('https://vision.googleapis.com/v1/images:annotate', body)
    const document = response.responses?.[0]
    const text = document?.fullTextAnnotation?.text?.trim() || document?.textAnnotations?.[0]?.description?.trim() || ''

    if (!text) {
      return null
    }

    return {
      text,
      confidence: averageConfidence(document?.fullTextAnnotation?.pages),
      provider: this.name,
    }
  }

  private async extractPdfText(tempFilePath: string): Promise<OcrResult | null> {
    const body = {
      requests: [
        {
          inputConfig: {
            mimeType: 'application/pdf',
            content: fs.readFileSync(tempFilePath).toString('base64'),
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    }

    const response = await this.postJson<AnnotateFileResponse>('https://vision.googleapis.com/v1/files:annotate', body)
    const pages = response.responses?.[0]?.responses || []
    const texts = pages
      .map((page) => page.fullTextAnnotation?.text?.trim() || '')
      .filter(Boolean)

    if (texts.length === 0) {
      return null
    }

    return {
      text: texts.join('\n\n'),
      confidence: averageConfidence(
        pages.flatMap((page) => page.fullTextAnnotation?.pages || []),
      ),
      provider: this.name,
    }
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const client = await this.auth.getClient()
    const headers = await client.getRequestHeaders()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Google Vision OCR request failed with ${response.status}`)
    }

    return response.json() as Promise<T>
  }
}

function averageConfidence(pages?: Array<{ confidence?: number }>): number | undefined {
  const values = (pages || []).map((page) => page.confidence).filter((value): value is number => typeof value === 'number')
  if (values.length === 0) {
    return undefined
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function createGoogleAuth() {
  const inlineCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()

  if (inlineCredentials) {
    const credentials = JSON.parse(inlineCredentials.replace(/\\n/g, '\n')) as {
      client_email?: string
      private_key?: string
    }

    return new GoogleAuth({
      scopes: [VISION_SCOPE],
      credentials,
    })
  }

  return new GoogleAuth({ scopes: [VISION_SCOPE] })
}
