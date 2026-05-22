import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { UploadReportUseCase } from '../../application/use-cases/UploadReport.usecase'
import { GetViolationsUseCase } from '../../application/use-cases/GetViolations.usecase'
import { ResolveViolationUseCase } from '../../application/use-cases/ResolveViolation.usecase'
import { PrismaProjectRepository } from '../repositories/PrismaProject.repository'
import { PrismaReportRepository } from '../repositories/PrismaReport.repository'
import { PrismaViolationRepository } from '../repositories/PrismaViolation.repository'
import { BullMQQueueService } from '../queue/BullMQ.queue'
import { CloudinaryUploadService } from '../cloudinary/Cloudinary.upload'
import { successResponse } from '@certiflow/shared'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const projectRepo = new PrismaProjectRepository()
const reportRepo = new PrismaReportRepository()
const violationRepo = new PrismaViolationRepository()
const queueService = new BullMQQueueService()
const fileUploadService = new CloudinaryUploadService()

const uploadReportUseCase = new UploadReportUseCase(projectRepo, reportRepo, queueService, fileUploadService)
const getViolationsUseCase = new GetViolationsUseCase(violationRepo, reportRepo)
const resolveViolationUseCase = new ResolveViolationUseCase(violationRepo)

router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const project = await projectRepo.findByIdForUser(req.body.projectId, userId)
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' })
      return
    }

    const report = await uploadReportUseCase.execute(req.body, req.file!)
    res.status(201).json(successResponse(report.toObject(), 'Report submitted. AI audit in progress.'))
  } catch (error) {
    next(error)
  }
})

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const reports = await reportRepo.findAll(userId)
    res.json(successResponse(reports.map((report) => report.toObject())))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const report = await reportRepo.findByIdForUser(req.params.id, userId)
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' })
      return
    }

    res.json(successResponse(report.toObject()))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/violations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const report = await reportRepo.findByIdForUser(req.params.id, userId)
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' })
      return
    }

    const violations = await getViolationsUseCase.execute(req.params.id)
    res.json(successResponse(violations.map((violation) => violation.toObject())))
  } catch (error) {
    next(error)
  }
})

router.patch('/violations/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const existingViolation = await violationRepo.findByIdForUser(req.params.id, userId)
    if (!existingViolation) {
      res.status(404).json({ success: false, error: 'Violation not found' })
      return
    }

    const violation = await resolveViolationUseCase.execute(req.params.id)
    res.json(successResponse(violation.toObject(), 'Violation marked as resolved'))
  } catch (error) {
    next(error)
  }
})

export default router
