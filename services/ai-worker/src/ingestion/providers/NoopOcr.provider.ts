import type { OcrProvider, OcrResult, SourceKind } from '../types'

export class NoopOcrProvider implements OcrProvider {
  readonly name = 'disabled'

  async extractText(_: { tempFilePath: string; fileUrl: string; sourceKind: SourceKind }): Promise<OcrResult | null> {
    return null
  }
}
