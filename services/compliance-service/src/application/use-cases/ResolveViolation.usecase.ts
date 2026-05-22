import { IViolationRepository } from '../../domain/repositories'
import { ViolationEntity } from '../../domain/entities/Violation.entity'
import { NotFoundError, createLogger } from '@certiflow/shared'

const logger = createLogger('compliance-service:resolve-violation')

export class ResolveViolationUseCase {
  constructor(private violationRepository: IViolationRepository) {}

  async execute(violationId: string): Promise<ViolationEntity> {
    logger.info('Resolving violation', { violationId })

    const violation = await this.violationRepository.findById(violationId)
    if (!violation) throw new NotFoundError(`Violation ${violationId}`)

    const resolvedViolation = violation.resolve()
    const saved = await this.violationRepository.update(resolvedViolation)

    logger.info('Violation resolved', { violationId })
    return saved
  }
}
