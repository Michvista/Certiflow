import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import { AuditResult, createLogger } from '@certiflow/shared'
import { createAuditContents, createGeminiClient, deleteHostedFile, ensureHostedOshaFile, uploadReportFile } from '../rag/retriever'

const logger = createLogger('ai-worker:auditor')

const SYSTEM_PROMPT = `
You are a senior construction safety auditor.
Review the site report against the OSHA material provided to you.

Return only valid JSON in this shape:
{
  "violations": [
    {
      "severity": "CRITICAL" | "MAJOR" | "MINOR",
      "ruleReference": "OSHA §1926.XXX",
      "description": "What the violation is",
      "suggestion": "Specific corrective action to take",
      "sector": "Area of site where found (if mentioned)"
    }
  ],
  "summary": "Brief 2-3 sentence overall assessment",
  "actionableCount": 3
}

If no violations are found, return an empty array and a compliant summary.
`.trim()

export async function auditReport(fileUrl: string, projectName: string): Promise<AuditResult> {
  const ai = createGeminiClient()

  logger.info('Starting AI audit', { projectName, fileUrl })

  let tempFilePath: string | null = null
  let hostedReportFile: Awaited<ReturnType<typeof uploadReportFile>> | null = null

  try {
    tempFilePath = await downloadFile(fileUrl)
    const hostedOshaFile = await ensureHostedOshaFile(ai)
    hostedReportFile = await uploadReportFile(ai, tempFilePath, fileUrl)

    logger.info('Gemini files ready for audit', {
      reportFileName: hostedReportFile.name,
      oshaFileName: hostedOshaFile.name,
    })

    const prompt = [
      SYSTEM_PROMPT,
      `Project: ${projectName}`,
      'Use the uploaded site report file as the primary evidence.',
      'Use the uploaded OSHA 29 CFR 1926 file as the compliance source of truth.',
      'Return only the JSON response.',
    ].join('\n\n')

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: createAuditContents(hostedReportFile, hostedOshaFile, prompt),
    })
    const rawResponse = result.text ?? ''

    logger.info('Gemini analysis complete, parsing response')
    return parseGeminiResponse(rawResponse, fileUrl)
  } catch (error) {
    logger.error('Audit failed', { error })
    throw error
  } finally {
    await deleteHostedFile(ai, hostedReportFile)

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}

function parseGeminiResponse(raw: string, fileUrl: string): AuditResult {
  const sourceKind = detectSourceKind(fileUrl)

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      violations: parsed.violations || [],
      summary: parsed.summary || 'Analysis complete.',
      actionableCount: parsed.actionableCount || parsed.violations?.length || 0,
      extraction: {
        strategy: 'GEMINI_FILE',
        sourceKind,
        ocrPerformed: sourceKind === 'image',
        ocrProvider: 'gemini-files',
      },
    }
  } catch (error) {
    logger.error('Failed to parse Gemini response', { raw, error })
    return {
      violations: [],
      summary: 'AI analysis could not be parsed. Manual review required.',
      actionableCount: 0,
      extraction: {
        strategy: 'GEMINI_FILE',
        sourceKind,
        ocrPerformed: sourceKind === 'image',
        ocrProvider: 'gemini-files',
      },
    }
  }
}

function detectSourceKind(fileUrl: string): AuditResult['extraction']['sourceKind'] {
  const extension = path.extname(fileUrl).toLowerCase()

  if (extension === '.pdf') return 'pdf'
  if (['.txt', '.csv', '.md', '.json'].includes(extension)) return 'text'
  if (['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp', '.gif'].includes(extension)) return 'image'
  return 'unknown'
}

function downloadFile(url: string): Promise<string> {
  const tempDir = path.join(__dirname, '..', '..', 'tmp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const extension = path.extname(new URL(url).pathname) || '.bin'
  const tempPath = path.join(tempDir, `report-${Date.now()}${extension}`)
  const requestClient = url.startsWith('https://') ? https : http

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tempPath)

    const request = requestClient.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        file.close()
        fs.unlink(tempPath, () => {})
        reject(new Error(`Failed to download report: ${response.statusCode}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(tempPath)
      })
    })

    request.on('error', (error) => {
      file.close()
      fs.unlink(tempPath, () => {})
      reject(error)
    })
  })
}
