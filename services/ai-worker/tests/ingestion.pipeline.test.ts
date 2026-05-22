jest.mock('pdf-parse', () => jest.fn())
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}))

import fs from 'fs'
import pdfParse from 'pdf-parse'
import { extractDocumentContentWithProvider } from '../src/ingestion/pipeline'
import type { OcrProvider } from '../src/ingestion/types'

describe('ingestion pipeline', () => {
  const mockOcrProvider: OcrProvider = {
    name: 'mock',
    extractText: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses native text extraction for text files', async () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue('  permit log contents  ')

    const result = await extractDocumentContentWithProvider('temp.txt', 'https://example.com/report.txt', mockOcrProvider)

    expect(result.strategy).toBe('native-text')
    expect(result.content).toBe('permit log contents')
    expect(mockOcrProvider.extractText).not.toHaveBeenCalled()
  })

  it('falls back to OCR for image files', async () => {
    ;(mockOcrProvider.extractText as jest.Mock).mockResolvedValue({
      text: 'worker on scaffold without harness',
      confidence: 0.91,
      provider: 'mock',
    })

    const result = await extractDocumentContentWithProvider('temp.png', 'https://example.com/report.png', mockOcrProvider)

    expect(result.strategy).toBe('ocr')
    expect(result.content).toContain('scaffold')
    expect(result.ocrPerformed).toBe(true)
    expect(result.ocrProvider).toBe('mock')
  })

  it('falls back to OCR when a PDF yields sparse text', async () => {
    ;(fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('pdf'))
    ;(pdfParse as jest.Mock).mockResolvedValue({ text: 'too short' })
    ;(mockOcrProvider.extractText as jest.Mock).mockResolvedValue({
      text: 'excavation report text from OCR',
      confidence: 0.84,
      provider: 'mock',
    })

    const result = await extractDocumentContentWithProvider('temp.pdf', 'https://example.com/report.pdf', mockOcrProvider)

    expect(result.strategy).toBe('ocr')
    expect(result.content).toContain('excavation')
    expect(mockOcrProvider.extractText).toHaveBeenCalled()
  })
})
