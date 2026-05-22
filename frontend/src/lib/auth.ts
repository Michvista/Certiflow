import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import type { AuthSession, ApiResponse } from '@certiflow/shared'

const STORAGE_KEY = 'certiflow-auth-session'
export const API_BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '')

function loadStoredSession(): AuthSession | null {
  if (!browser) return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const authSession = writable<AuthSession | null>(loadStoredSession())

export function getStoredSession() {
  return loadStoredSession()
}

export function setAuthSession(session: AuthSession | null) {
  authSession.set(session)

  if (!browser) return
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

async function postAuth(path: string, body: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as ApiResponse<AuthSession>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || 'Authentication failed')
  }

  setAuthSession(payload.data)
  return payload.data
}

export function register(input: { name: string; email: string; password: string }) {
  return postAuth('/auth/register', input)
}

export function login(input: { email: string; password: string }) {
  return postAuth('/auth/login', input)
}

export function logout() {
  setAuthSession(null)
}
