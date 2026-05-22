import { createLogger } from '@certiflow/shared'
import { IProjectRepository } from '../../domain/repositories'
import { ProjectEntity } from '../../domain/entities/Project.entity'

const logger = createLogger('compliance-service:list-projects')

export class ListProjectsUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(userId: string): Promise<ProjectEntity[]> {
    logger.info('Listing projects', { userId })
    return this.projectRepository.findByUserId(userId)
  }
}
