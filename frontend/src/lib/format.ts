import type { ReportStatus, ViolationSeverity } from '@certiflow/shared'

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(value)
}

export function statusTone(status: ReportStatus) {
  return {
    PENDING: 'pending',
    ANALYZING: 'analyzing',
    COMPLETE: 'complete',
    FAILED: 'failed',
  }[status]
}

export function severityTone(severity: ViolationSeverity) {
  return {
    CRITICAL: 'critical',
    MAJOR: 'major',
    MINOR: 'minor',
  }[severity]
}
