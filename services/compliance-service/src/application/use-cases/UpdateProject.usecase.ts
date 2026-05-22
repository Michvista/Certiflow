import { NotFoundError, ValidationError, createLogger } from '@certiflow/shared'
import { UpdateProjectDTO } from '../dto/report.dto'
import { IProjectRepository } from '../../domain/repositories'
import { ProjectEntity } from '../../domain/entities/Project.entity'

const logger = createLogger('compliance-service:update-project')

export class UpdateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(input: UpdateProjectDTO): Promise<ProjectEntity> {
    const name = input.name.trim()
    const location = input.location.trim()
    const userId = input.userId.trim()

    if (!input.projectId) throw new ValidationError('projectId is required')
    if (!name) throw new ValidationError('name is required')
    if (!location) throw new ValidationError('location is required')
    if (!userId) throw new ValidationError('userId is required')

    const existing = await this.projectRepository.findByIdForUser(input.projectId, userId)
    if (!existing) {
      throw new NotFoundError('Project')
    }

    const updated = existing.relocate(location).rename(name)
    const saved = await this.projectRepository.update(updated)
    logger.info('Project updated', { projectId: saved.id, userId })
    return saved
  }
}
