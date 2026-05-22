import { AuditJobPayload } from '@certiflow/shared'

export interface IQueueService {
  publishAuditJob(payload: AuditJobPayload): Promise<void>
}
