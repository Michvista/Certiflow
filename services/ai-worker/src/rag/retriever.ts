import * as fs from 'fs'
import * as path from 'path'
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai'
import { createLogger } from '@certiflow/shared'

const logger = createLogger('ai-worker:gemini-files')
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FILE_POLL_INTERVAL_MS = 2000
const FILE_POLL_TIMEOUT_MS = 60_000

interface HostedFile {
  name: string
  uri: string
  mimeType?: string
  state?: string | { name?: string } | null
}

let cachedOshaFile: HostedFile | null = null

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  return new GoogleGenAI({ apiKey })
}

export async function ensureHostedOshaFile(ai: GoogleGenAI): Promise<HostedFile> {
  if (cachedOshaFile?.name) {
    try {
      const existing = await ai.files.get({ name: cachedOshaFile.name })
      const active = await waitForFileActive(ai, normalizeHostedFile(existing))
      cachedOshaFile = active
      return active
    } catch (error) {
      logger.warn('Cached OSHA Gemini file was unavailable, re-uploading', { error })
      cachedOshaFile = null
    }
  }

  const oshaPdfPath = resolveOshaPdfPath()
  if (!oshaPdfPath) {
    throw new Error('OSHA reference PDF not found at services/ai-worker/src/rag/documents/osha-1926.pdf')
  }

  const uploaded = await ai.files.upload({
    file: oshaPdfPath,
    config: {
      mimeType: 'application/pdf',
      displayName: 'OSHA 29 CFR 1926',
    },
  })

  cachedOshaFile = await waitForFileActive(ai, normalizeHostedFile(uploaded))
  logger.info('Uploaded OSHA reference file to Gemini', { name: cachedOshaFile.name })
  return cachedOshaFile
}

export async function uploadReportFile(ai: GoogleGenAI, tempFilePath: string, fileUrl: string): Promise<HostedFile> {
  const mimeType = inferMimeType(tempFilePath, fileUrl)
  const uploaded = await ai.files.upload({
    file: tempFilePath,
    config: {
      mimeType,
      displayName: `Site report ${path.basename(tempFilePath)}`,
    },
  })

  return waitForFileActive(ai, normalizeHostedFile(uploaded))
}

export function createAuditContents(reportFile: HostedFile, oshaFile: HostedFile, prompt: string) {
  return createUserContent([
    createPartFromUri(reportFile.uri, reportFile.mimeType || 'application/octet-stream'),
    createPartFromUri(oshaFile.uri, oshaFile.mimeType || 'application/pdf'),
    prompt,
  ])
}

export async function deleteHostedFile(ai: GoogleGenAI, hostedFile: HostedFile | null) {
  if (!hostedFile?.name) {
    return
  }

  try {
    await ai.files.delete({ name: hostedFile.name })
  } catch (error) {
    logger.warn('Failed to delete Gemini hosted file', { name: hostedFile.name, error })
  }
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

async function waitForFileActive(ai: GoogleGenAI, file: HostedFile): Promise<HostedFile> {
  const startedAt = Date.now()
  let current = file

  while (true) {
    const state = readFileState(current)

    if (!state || state === 'ACTIVE') {
      return current
    }

    if (state === 'FAILED') {
      throw new Error(`Gemini file processing failed for ${current.name}`)
    }

    if (Date.now() - startedAt > FILE_POLL_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for Gemini file to become ACTIVE: ${current.name}`)
    }

    await sleep(FILE_POLL_INTERVAL_MS)
    current = normalizeHostedFile(await ai.files.get({ name: current.name }))
  }
}

function readFileState(file: HostedFile) {
  if (!file.state) {
    return null
  }

  if (typeof file.state === 'string') {
    return file.state
  }

  return file.state.name || null
}

function normalizeHostedFile(file: {
  name?: string
  uri?: string
  mimeType?: string
  state?: string | { name?: string } | null
}): HostedFile {
  if (!file.name || !file.uri) {
    throw new Error('Gemini file response did not include a file name and uri')
  }

  return {
    name: file.name,
    uri: file.uri,
    mimeType: file.mimeType,
    state: file.state ?? null,
  }
}

function inferMimeType(tempFilePath: string, fileUrl: string) {
  const extension = path.extname(fileUrl || tempFilePath).toLowerCase()

  if (extension === '.pdf') return 'application/pdf'
  if (extension === '.txt') return 'text/plain'
  if (extension === '.md') return 'text/markdown'
  if (extension === '.csv') return 'text/csv'
  if (extension === '.json') return 'application/json'
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.bmp') return 'image/bmp'
  if (extension === '.tif' || extension === '.tiff') return 'image/tiff'
  return 'application/octet-stream'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
