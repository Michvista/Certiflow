import { ReportType } from '@certiflow/shared'

export interface UploadReportDTO {
  projectId: string
  projectName?: string
  reportType: ReportType
  notes?: string
}

export interface GetReportDTO {
  reportId: string
  userId: string
}

export interface CreateProjectDTO {
  name: string
  location: string
  userId: string
}

export interface UpdateProjectDTO {
  projectId: string
  name: string
  location: string
  userId: string
}

export interface ResolveViolationDTO {
  violationId: string
  userId: string
}
