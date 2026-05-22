export type ExtractionStrategy = 'native-text' | 'ocr' | 'none'

export type SourceKind = 'pdf' | 'text' | 'image' | 'unknown'

export interface OcrResult {
  text: string
  confidence?: number
  provider: string
}

export interface OcrProvider {
  readonly name: string
  extractText(input: { tempFilePath: string; fileUrl: string; sourceKind: SourceKind }): Promise<OcrResult | null>
}

export interface ExtractedDocument {
  content: string
  sourceKind: SourceKind
  strategy: ExtractionStrategy
  ocrPerformed: boolean
  ocrProvider?: string
  ocrConfidence?: number
}
