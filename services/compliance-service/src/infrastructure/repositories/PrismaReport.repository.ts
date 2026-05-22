import { prisma } from '../prisma/client'
import { IReportRepository } from '../../domain/repositories'
import { ReportEntity } from '../../domain/entities/Report.entity'
import { ReportStatus, ReportType } from '@certiflow/shared'

type ReportRecord = {
  id: string
  projectId: string
  reportType: ReportType
  fileUrl: string
  status: ReportStatus
  notes: string | null
  uploadedAt: Date
}

export class PrismaReportRepository implements IReportRepository {
  private toDomain(record: ReportRecord): ReportEntity {
    return new ReportEntity({
      id: record.id,
      projectId: record.projectId,
      reportType: record.reportType,
      fileUrl: record.fileUrl,
      status: record.status,
      notes: record.notes ?? undefined,
      uploadedAt: record.uploadedAt,
    })
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const record = await prisma.report.findUnique({ where: { id } })
    return record ? this.toDomain(record as ReportRecord) : null
  }

  async findByIdForUser(id: string, userId: string): Promise<ReportEntity | null> {
    const record = await prisma.report.findFirst({
      where: {
        id,
        project: { userId },
      },
    })

    return record ? this.toDomain(record as ReportRecord) : null
  }

  async findByProjectId(projectId: string): Promise<ReportEntity[]> {
    const records = await prisma.report.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
    })

    return records.map((record: ReportRecord) => this.toDomain(record))
  }

  async findAll(userId: string): Promise<ReportEntity[]> {
    const records = await prisma.report.findMany({
      where: { project: { userId } },
      orderBy: { uploadedAt: 'desc' },
    })

    return records.map((record: ReportRecord) => this.toDomain(record))
  }

  async save(report: ReportEntity): Promise<ReportEntity> {
    const data = report.toObject()
    const record = await prisma.report.create({
      data: {
        id: data.id,
        projectId: data.projectId,
        reportType: data.reportType,
        fileUrl: data.fileUrl,
        status: data.status,
        notes: data.notes,
      },
    })

    return this.toDomain(record as ReportRecord)
  }

  async update(report: ReportEntity): Promise<ReportEntity> {
    const data = report.toObject()
    const record = await prisma.report.update({
      where: { id: data.id },
      data: { status: data.status },
    })

    return this.toDomain(record as ReportRecord)
  }

  async delete(id: string): Promise<void> {
    await prisma.report.delete({ where: { id } })
  }
}
