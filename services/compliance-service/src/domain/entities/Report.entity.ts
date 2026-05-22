import { ReportStatus, ReportType } from '@certiflow/shared'

interface ReportProps {
  id: string
  projectId: string
  reportType: ReportType
  fileUrl: string
  status: ReportStatus
  notes?: string
  uploadedAt: Date
}

export class ReportEntity {
  private props: ReportProps

  constructor(props: ReportProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get projectId() { return this.props.projectId }
  get reportType() { return this.props.reportType }
  get fileUrl() { return this.props.fileUrl }
  get status() { return this.props.status }
  get notes() { return this.props.notes }
  get uploadedAt() { return this.props.uploadedAt }

  canBeAnalyzed(): boolean {
    return this.props.status === 'PENDING'
  }

  canBeCompleted(): boolean {
    return this.props.status === 'ANALYZING'
  }

  isFailed(): boolean {
    return this.props.status === 'FAILED'
  }

  markAsAnalyzing(): ReportEntity {
    if (!this.canBeAnalyzed()) {
      throw new Error(`Report ${this.id} cannot be analyzed while ${this.status}`)
    }

    return new ReportEntity({ ...this.props, status: 'ANALYZING' })
  }

  markAsComplete(): ReportEntity {
    if (!this.canBeCompleted()) {
      throw new Error(`Report ${this.id} cannot be completed while ${this.status}`)
    }

    return new ReportEntity({ ...this.props, status: 'COMPLETE' })
  }

  markAsFailed(): ReportEntity {
    return new ReportEntity({ ...this.props, status: 'FAILED' })
  }

  static create(props: Omit<ReportProps, 'status' | 'uploadedAt'>): ReportEntity {
    return new ReportEntity({
      ...props,
      status: 'PENDING',
      uploadedAt: new Date(),
    })
  }

  toObject(): ReportProps {
    return { ...this.props }
  }
}
