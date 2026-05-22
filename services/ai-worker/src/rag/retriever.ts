import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'
import { createLogger } from '@certiflow/shared'

const logger = createLogger('ai-worker:rag-retriever')

const fallbackOshaExcerpt = `
OSHA 29 CFR 1926 - Construction Safety Standards

§1926.651 - Excavations: General Requirements
Daily inspections of excavations and nearby areas shall be made by a competent person
for evidence of cave-ins, failures of protective systems, hazardous atmospheres, or
other dangerous conditions.

§1926.451(g)(1) - Scaffolds: Fall Protection
Each employee on a scaffold more than 10 feet above a lower level shall be protected by
a personal fall arrest system or guardrail system.

§1926.100 - Head Protection
Employees working where head injury hazards exist shall be protected by protective helmets.

§1926.102 - Eye and Face Protection
Eye and face protection shall be provided when operations present a risk of injury.

§1926.150 - Fire Protection
The employer is responsible for maintaining a fire protection program throughout the work.
`.trim()

let cachedOshaText: string | null = null

export async function loadOshaDocument(): Promise<string> {
  if (cachedOshaText) {
    logger.info('Using cached OSHA reference text')
    return cachedOshaText
  }

  const oshaPdfPath = resolveOshaPdfPath()
  if (!oshaPdfPath) {
    logger.warn('OSHA PDF not found, falling back to bundled excerpt')
    cachedOshaText = fallbackOshaExcerpt
    return cachedOshaText
  }

  logger.info('Loading OSHA PDF from disk', { oshaPdfPath })
  const dataBuffer = fs.readFileSync(oshaPdfPath)
  const pdfData = await pdfParse(dataBuffer)

  cachedOshaText = pdfData.text?.trim() || fallbackOshaExcerpt
  logger.info('OSHA reference text loaded', { characters: cachedOshaText.length })
  return cachedOshaText
}

export async function getRelevantRules(reportContent: string): Promise<string> {
  const oshaText = await loadOshaDocument()
  const keywords = extractKeywords(reportContent)
  const relevantSections = findRelevantSections(oshaText, keywords)

  logger.info('Retrieved OSHA context', { keywordsFound: keywords.length })
  return relevantSections
}

function resolveOshaPdfPath() {
  const candidates = [
    path.join(__dirname, 'documents', 'osha-1926.pdf'),
    path.join(__dirname, '..', '..', 'src', 'rag', 'documents', 'osha-1926.pdf'),
    path.join(process.cwd(), 'services', 'ai-worker', 'src', 'rag', 'documents', 'osha-1926.pdf'),
    path.join(process.cwd(), 'src', 'rag', 'documents', 'osha-1926.pdf'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function extractKeywords(text: string): string[] {
  const safetyKeywords = [
    'excavat', 'trench', 'scaffold', 'fall', 'head', 'helmet', 'fire',
    'eye', 'face', 'electrical', 'ladder', 'crane', 'lift', 'ppe',
    'hazard', 'guardrail', 'harness', 'chemical', 'noise', 'respirat',
  ]

  const lowerText = text.toLowerCase()
  return safetyKeywords.filter((keyword) => lowerText.includes(keyword))
}

function findRelevantSections(oshaText: string, keywords: string[]): string {
  const sections = oshaText
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)

  if (keywords.length === 0) {
    return sections.slice(0, 5).join('\n\n')
  }

  const relevant = sections.filter((section) =>
    keywords.some((keyword) => section.toLowerCase().includes(keyword))
  )

  return (relevant.length > 0 ? relevant : sections.slice(0, 5)).join('\n\n')
}
