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

    return violations.sort((a, b) => {
      const priority = { CRITICAL: 3, MAJOR: 2, MINOR: 1 }
      return priority[b.severity] - priority[a.severity]
    })
  }
}
