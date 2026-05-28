import { IViolationRepository, IReportRepository } from '../../domain/repositories'
import { ViolationEntity } from '../../domain/entities/Violation.entity'
import { NotFoundError, createLogger } from '@certiflow/shared'

const logger = createLogger('compliance-service:get-violations')

export class GetViolationsUseCase {
  constructor(
    private violationRepository: IViolationRepository,
    private reportRepository: IReportRepository,
  ) {}

  async execute(reportId: string): Promise<ViolationEntity[]> {
    logger.info('Fetching violations', { reportId })

    const report = await this.reportRepository.findById(reportId)
    if (!report) throw new NotFoundError(`Report ${reportId}`)

    const violations = await this.violationRepository.findByReportId(reportId)

    // Sort by severity urgency using VO comparison logic
    return violations.sort((a, b) => {
      if (b.severity.isMoreUrgentThan(a.severity)) return 1
      if (a.severity.isMoreUrgentThan(b.severity)) return -1
      return 0
    })
  }
}
