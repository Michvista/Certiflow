import { prisma } from '../prisma/client'
import { IProjectRepository } from '../../domain/repositories'
import { ProjectEntity } from '../../domain/entities/Project.entity'

type ProjectRecord = {
  id: string
  name: string
  location: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export class PrismaProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<ProjectEntity | null> {
    const project = await prisma.project.findUnique({ where: { id } })
    return project ? this.toDomain(project as ProjectRecord) : null
  }

  async findByIdForUser(id: string, userId: string): Promise<ProjectEntity | null> {
    const project = await prisma.project.findFirst({
      where: { id, userId },
    })

    return project ? this.toDomain(project as ProjectRecord) : null
  }

  async findByUserId(userId: string): Promise<ProjectEntity[]> {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return projects.map((project: ProjectRecord) => this.toDomain(project))
  }

  async save(project: ProjectEntity): Promise<ProjectEntity> {
    const data = project.toObject()
    const saved = await prisma.project.create({
      data: {
        id: data.id,
        name: data.name,
        location: data.location,
        userId: data.userId,
      },
    })

    return this.toDomain(saved as ProjectRecord)
  }

  async update(project: ProjectEntity): Promise<ProjectEntity> {
    const data = project.toObject()
    const saved = await prisma.project.update({
      where: { id: data.id },
      data: {
        name: data.name,
        location: data.location,
      },
    })

    return this.toDomain(saved as ProjectRecord)
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } })
  }

  private toDomain(project: ProjectRecord) {
    return new ProjectEntity({
      id: project.id,
      name: project.name,
      location: project.location,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  }
}
