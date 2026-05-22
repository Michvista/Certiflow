import type { OcrProvider, OcrResult, SourceKind } from '../types'

export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock'

  async extractText(input: { tempFilePath: string; fileUrl: string; sourceKind: SourceKind }): Promise<OcrResult | null> {
    const configuredText = process.env.OCR_MOCK_TEXT?.trim()

    return {
      text: configuredText || `Mock OCR extracted text from ${input.sourceKind} file at ${input.fileUrl}`,
      confidence: 0.75,
      provider: this.name,
    }
  }
}
