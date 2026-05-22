import { NotFoundError, ValidationError, createLogger } from '@certiflow/shared'
import { IProjectRepository, IReportRepository } from '../../domain/repositories'

const logger = createLogger('compliance-service:delete-project')

export class DeleteProjectUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly reportRepository: IReportRepository,
  ) {}

  async execute(projectId: string, userId: string): Promise<void> {
    if (!projectId) throw new ValidationError('projectId is required')
    if (!userId) throw new ValidationError('userId is required')

    const project = await this.projectRepository.findByIdForUser(projectId, userId)
    if (!project) {
      throw new NotFoundError('Project')
    }

    const reports = await this.reportRepository.findByProjectId(projectId)
    if (reports.length > 0) {
      throw new ValidationError('Delete the project reports before removing this project')
    }

    await this.projectRepository.delete(projectId)
    logger.info('Project deleted', { projectId, userId })
  }
}
