import { ProjectEntity } from '../entities/Project.entity'
import { ReportEntity } from '../entities/Report.entity'
import { ViolationEntity } from '../entities/Violation.entity'

export interface IReportRepository {
  findById(id: string): Promise<ReportEntity | null>
  findByIdForUser(id: string, userId: string): Promise<ReportEntity | null>
  findByProjectId(projectId: string): Promise<ReportEntity[]>
  findAll(userId: string): Promise<ReportEntity[]>
  save(report: ReportEntity): Promise<ReportEntity>
  update(report: ReportEntity): Promise<ReportEntity>
  delete(id: string): Promise<void>
}

export interface IViolationRepository {
  findById(id: string): Promise<ViolationEntity | null>
  findByIdForUser(id: string, userId: string): Promise<ViolationEntity | null>
  findByReportId(reportId: string): Promise<ViolationEntity[]>
  saveMany(violations: ViolationEntity[]): Promise<ViolationEntity[]>
  update(violation: ViolationEntity): Promise<ViolationEntity>
}

export interface IProjectRepository {
  findById(id: string): Promise<ProjectEntity | null>
  findByIdForUser(id: string, userId: string): Promise<ProjectEntity | null>
  findByUserId(userId: string): Promise<ProjectEntity[]>
  save(project: ProjectEntity): Promise<ProjectEntity>
  update(project: ProjectEntity): Promise<ProjectEntity>
  delete(id: string): Promise<void>
}
