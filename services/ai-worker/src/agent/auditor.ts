import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AuditResult, createLogger } from '@certiflow/shared'
import { getRelevantRules } from '../rag/retriever'

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
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  logger.info('Starting AI audit', { projectName, fileUrl })

  let tempFilePath: string | null = null

  try {
    tempFilePath = await downloadFile(fileUrl)
    const reportContent = await extractReportContent(tempFilePath, fileUrl)
    const relevantRules = await getRelevantRules(reportContent || `construction site report for ${projectName}`)

    const prompt = [
      SYSTEM_PROMPT,
      `Project: ${projectName}`,
      'Relevant OSHA Regulations:',
      relevantRules,
      'Report Content:',
      reportContent || `A report file was provided at ${fileUrl}, but readable text could not be extracted.`,
      'Return only the JSON response.',
    ].join('\n\n')

    const result = await model.generateContent(prompt)
    const rawResponse = result.response.text()

    logger.info('Gemini analysis complete, parsing response')
    return parseGeminiResponse(rawResponse)
  } catch (error) {
    logger.error('Audit failed', { error })
    throw error
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}

function parseGeminiResponse(raw: string): AuditResult {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      violations: parsed.violations || [],
      summary: parsed.summary || 'Analysis complete.',
      actionableCount: parsed.actionableCount || parsed.violations?.length || 0,
    }
  } catch (error) {
    logger.error('Failed to parse Gemini response', { raw, error })
    return {
      violations: [],
      summary: 'AI analysis could not be parsed. Manual review required.',
      actionableCount: 0,
    }
  }
}

async function extractReportContent(tempFilePath: string, fileUrl: string): Promise<string> {
  const extension = path.extname(fileUrl).toLowerCase()

  if (extension === '.pdf') {
    const pdfData = await pdfParse(fs.readFileSync(tempFilePath))
    return pdfData.text?.trim() || ''
  }

  if (['.txt', '.csv', '.md', '.json'].includes(extension)) {
    return fs.readFileSync(tempFilePath, 'utf-8').trim()
  }

  logger.warn('No text extractor configured for this file type', { extension })
  return ''
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
