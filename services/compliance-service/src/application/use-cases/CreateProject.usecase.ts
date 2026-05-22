import { ValidationError, createLogger } from '@certiflow/shared'
import { randomUUID } from 'crypto'
import { CreateProjectDTO } from '../dto/report.dto'
import { ProjectEntity } from '../../domain/entities/Project.entity'
import { IProjectRepository } from '../../domain/repositories'

const logger = createLogger('compliance-service:create-project')

export class CreateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(input: CreateProjectDTO): Promise<ProjectEntity> {
    const name = input.name.trim()
    const location = input.location.trim()
    const userId = input.userId.trim()

    if (!name) throw new ValidationError('name is required')
    if (!location) throw new ValidationError('location is required')
    if (!userId) throw new ValidationError('userId is required')

    const project = ProjectEntity.create({
      id: randomUUID(),
      name,
      location,
      userId,
    })

    const saved = await this.projectRepository.save(project)
    logger.info('Project created', { projectId: saved.id, userId })
    return saved
  }
}
