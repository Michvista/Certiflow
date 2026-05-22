import { DeleteProjectUseCase } from '../src/application/use-cases/DeleteProject.usecase'
import { UpdateProjectUseCase } from '../src/application/use-cases/UpdateProject.usecase'
import { ProjectEntity } from '../src/domain/entities/Project.entity'
import type { IProjectRepository, IReportRepository } from '../src/domain/repositories'

function makeProject(overrides: Partial<ReturnType<ProjectEntity['toObject']>> = {}) {
  return new ProjectEntity({
    id: 'project-1',
    name: 'Tower A',
    location: 'Lagos',
    userId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  })
}

function makeProjectRepository(overrides: Partial<IProjectRepository> = {}): IProjectRepository {
  return {
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  }
}

function makeReportRepository(overrides: Partial<IReportRepository> = {}): IReportRepository {
  return {
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    findByProjectId: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  }
}

describe('Project use cases', () => {
  describe('UpdateProjectUseCase', () => {
    it('updates a project for its owner', async () => {
      const existing = makeProject()
      const updated = makeProject({
        name: 'Tower B',
        location: 'Abuja',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      })

      const projectRepository = makeProjectRepository({
        findByIdForUser: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      })

      const useCase = new UpdateProjectUseCase(projectRepository)

      const result = await useCase.execute({
        projectId: 'project-1',
        name: ' Tower B ',
        location: ' Abuja ',
        userId: 'user-1',
      })

      expect(projectRepository.findByIdForUser).toHaveBeenCalledWith('project-1', 'user-1')
      expect(projectRepository.update).toHaveBeenCalled()
      expect(result.name).toBe('Tower B')
      expect(result.location).toBe('Abuja')
    })

    it('rejects blank fields after trimming', async () => {
      const projectRepository = makeProjectRepository()
      const useCase = new UpdateProjectUseCase(projectRepository)

      await expect(useCase.execute({
        projectId: 'project-1',
        name: '   ',
        location: 'Lagos',
        userId: 'user-1',
      })).rejects.toThrow('name is required')
    })
  })

  describe('DeleteProjectUseCase', () => {
    it('deletes a project when it has no reports', async () => {
      const projectRepository = makeProjectRepository({
        findByIdForUser: jest.fn().mockResolvedValue(makeProject()),
        delete: jest.fn().mockResolvedValue(undefined),
      })
      const reportRepository = makeReportRepository({
        findByProjectId: jest.fn().mockResolvedValue([]),
      })

      const useCase = new DeleteProjectUseCase(projectRepository, reportRepository)

      await useCase.execute('project-1', 'user-1')

      expect(projectRepository.findByIdForUser).toHaveBeenCalledWith('project-1', 'user-1')
      expect(reportRepository.findByProjectId).toHaveBeenCalledWith('project-1')
      expect(projectRepository.delete).toHaveBeenCalledWith('project-1')
    })

    it('blocks deletion when reports still exist', async () => {
      const projectRepository = makeProjectRepository({
        findByIdForUser: jest.fn().mockResolvedValue(makeProject()),
      })
      const reportRepository = makeReportRepository({
        findByProjectId: jest.fn().mockResolvedValue([{} as never]),
      })

      const useCase = new DeleteProjectUseCase(projectRepository, reportRepository)

      await expect(useCase.execute('project-1', 'user-1')).rejects.toThrow(
        'Delete the project reports before removing this project',
      )
      expect(projectRepository.delete).not.toHaveBeenCalled()
    })
  })
})
