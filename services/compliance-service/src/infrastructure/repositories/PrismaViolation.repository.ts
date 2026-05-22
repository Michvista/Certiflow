import { prisma } from '../prisma/client'
import { IViolationRepository } from '../../domain/repositories'
import { ViolationEntity } from '../../domain/entities/Violation.entity'
import { ViolationSeverity } from '@certiflow/shared'

type ViolationRecord = {
  id: string
  reportId: string
  ruleReference: string
  severity: ViolationSeverity
  description: string
  suggestion: string
  sector: string | null
  isResolved: boolean
  detectedAt: Date
}

export class PrismaViolationRepository implements IViolationRepository {
  private toDomain(record: ViolationRecord): ViolationEntity {
    return new ViolationEntity({
      id: record.id,
      reportId: record.reportId,
      ruleReference: record.ruleReference,
      severity: record.severity,
      description: record.description,
      suggestion: record.suggestion,
      sector: record.sector ?? undefined,
      isResolved: record.isResolved,
      detectedAt: record.detectedAt,
    })
  }

  async findById(id: string): Promise<ViolationEntity | null> {
    const record = await prisma.violation.findUnique({ where: { id } })
    return record ? this.toDomain(record as ViolationRecord) : null
  }

  async findByIdForUser(id: string, userId: string): Promise<ViolationEntity | null> {
    const record = await prisma.violation.findFirst({
      where: {
        id,
        report: {
          project: { userId },
        },
      },
    })

    return record ? this.toDomain(record as ViolationRecord) : null
  }

  async findByReportId(reportId: string): Promise<ViolationEntity[]> {
    const records = await prisma.violation.findMany({
      where: { reportId },
      orderBy: { detectedAt: 'desc' },
    })

    return records.map((record: ViolationRecord) => this.toDomain(record))
  }

  async saveMany(violations: ViolationEntity[]): Promise<ViolationEntity[]> {
    if (violations.length === 0) {
      return []
    }

    const records = violations.map((violation) => violation.toObject())

    await prisma.violation.createMany({
      data: records.map((record) => ({
        id: record.id,
        reportId: record.reportId,
        ruleReference: record.ruleReference,
        severity: record.severity,
        description: record.description,
        suggestion: record.suggestion,
        sector: record.sector ?? null,
        isResolved: record.isResolved,
        detectedAt: record.detectedAt,
      })),
    })

    return records.map((record) => this.toDomain({ ...record, sector: record.sector ?? null }))
  }

  async update(violation: ViolationEntity): Promise<ViolationEntity> {
    const data = violation.toObject()
    const record = await prisma.violation.update({
      where: { id: data.id },
      data: {
        ruleReference: data.ruleReference,
        severity: data.severity,
        description: data.description,
        suggestion: data.suggestion,
        sector: data.sector ?? null,
        isResolved: data.isResolved,
      },
    })

    return this.toDomain(record as ViolationRecord)
  }
}
