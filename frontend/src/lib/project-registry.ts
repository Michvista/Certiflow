import type { ApiResponse, Project } from '@certiflow/shared'
import { API_BASE_URL, getStoredSession } from './auth'

type ProjectRecord = Omit<Project, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date
  updatedAt: string | Date
}

function createHeaders() {
  const headers = new Headers()
  const session = getStoredSession()
  if (session) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }
  return headers
}

function toProject(record: ProjectRecord): Project {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    headers: createHeaders(),
  })

  const payload = (await response.json()) as ApiResponse<ProjectRecord[]>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || 'Unable to load projects')
  }

  return payload.data.map(toProject)
}

export async function createProject(input: { name: string; location: string }): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getStoredSession()?.token || ''}`,
    }),
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as ApiResponse<ProjectRecord>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || 'Unable to create project')
  }

  return toProject(payload.data)
}

export async function updateProject(projectId: string, input: { name: string; location: string }): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PATCH',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getStoredSession()?.token || ''}`,
    }),
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as ApiResponse<ProjectRecord>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || 'Unable to update project')
  }

  return toProject(payload.data)
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: createHeaders(),
  })

  const payload = (await response.json()) as ApiResponse<{ id: string }>
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Unable to delete project')
  }
}

export function resolveProjectName(projectId: string, projects: Project[]) {
  return projects.find((project) => project.id === projectId)?.name || projectId
}
