import { IProjectRepository, IReportRepository } from '../../domain/repositories'
import { ReportEntity } from '../../domain/entities/Report.entity'
import { IQueueService } from '../interfaces/queue.interface'
import { IFileUploadService } from '../interfaces/file-upload.interface'
import { UploadReportDTO } from '../dto/report.dto'
import { AuditJobPayload, ValidationError, createLogger } from '@certiflow/shared'
import { randomUUID } from 'crypto'

const logger = createLogger('compliance-service:upload-report')

export class UploadReportUseCase {
  constructor(
    private projectRepository: IProjectRepository,
    private reportRepository: IReportRepository,
    private queueService: IQueueService,
    private fileUploadService: IFileUploadService,
  ) {}

  async execute(dto: UploadReportDTO, file: Express.Multer.File): Promise<ReportEntity> {
    logger.info('Starting report upload', { projectId: dto.projectId })

    if (!dto.projectId) throw new ValidationError('projectId is required')
    if (!dto.reportType) throw new ValidationError('reportType is required')
    if (!file) throw new ValidationError('A file is required')

    const project = await this.projectRepository.findById(dto.projectId)
    if (!project) throw new ValidationError('projectId does not match an existing project')

    const fileUrl = await this.fileUploadService.upload(file)
    logger.info('File uploaded to Cloudinary', { fileUrl })

    const report = ReportEntity.create({
      id: randomUUID(),
      projectId: dto.projectId,
      reportType: dto.reportType,
      fileUrl,
      notes: dto.notes,
    })

    const savedReport = await this.reportRepository.save(report)
    logger.info('Report saved to database', { reportId: savedReport.id })

    const jobPayload: AuditJobPayload = {
      reportId: savedReport.id,
      fileUrl: savedReport.fileUrl,
      projectId: savedReport.projectId,
      projectName: dto.projectName || project.name,
      reportType: savedReport.reportType,
    }

    await this.queueService.publishAuditJob(jobPayload)
    logger.info('Audit job published to queue', { reportId: savedReport.id })

    return savedReport
  }
}
