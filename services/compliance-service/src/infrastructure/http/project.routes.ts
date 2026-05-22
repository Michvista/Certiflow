import { Router, Request, Response, NextFunction } from 'express'
import { successResponse } from '@certiflow/shared'
import { CreateProjectUseCase } from '../../application/use-cases/CreateProject.usecase'
import { ListProjectsUseCase } from '../../application/use-cases/ListProjects.usecase'
import { UpdateProjectUseCase } from '../../application/use-cases/UpdateProject.usecase'
import { DeleteProjectUseCase } from '../../application/use-cases/DeleteProject.usecase'
import { PrismaProjectRepository } from '../repositories/PrismaProject.repository'
import { PrismaReportRepository } from '../repositories/PrismaReport.repository'

const router = Router()
const projectRepository = new PrismaProjectRepository()
const reportRepository = new PrismaReportRepository()
const createProjectUseCase = new CreateProjectUseCase(projectRepository)
const listProjectsUseCase = new ListProjectsUseCase(projectRepository)
const updateProjectUseCase = new UpdateProjectUseCase(projectRepository)
const deleteProjectUseCase = new DeleteProjectUseCase(projectRepository, reportRepository)

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const projects = await listProjectsUseCase.execute(userId)
    res.json(successResponse(projects.map((project) => project.toObject())))
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const project = await createProjectUseCase.execute({
      ...req.body,
      userId,
    })

    res.status(201).json(successResponse(project.toObject(), 'Project created'))
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const project = await updateProjectUseCase.execute({
      projectId: req.params.id,
      name: req.body.name,
      location: req.body.location,
      userId,
    })

    res.json(successResponse(project.toObject(), 'Project updated'))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    await deleteProjectUseCase.execute(req.params.id, userId)
    res.json(successResponse({ id: req.params.id }, 'Project deleted'))
  } catch (error) {
    next(error)
  }
})

export default router
