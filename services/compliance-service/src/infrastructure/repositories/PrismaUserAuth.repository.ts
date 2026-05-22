import { prisma } from '../prisma/client'
import { AuthUserRecord, AuthUserRepository } from '../../application/interfaces/auth.interface'

type PrismaUser = {
  id: string
  name: string
  email: string
  password: string
}

export class PrismaUserAuthRepository implements AuthUserRepository {
  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    return user ? this.toRecord(user as PrismaUser) : null
  }

  async create(input: { name: string; email: string; password: string }): Promise<AuthUserRecord> {
    const user = await prisma.user.create({ data: input })
    return this.toRecord(user as PrismaUser)
  }

  private toRecord(user: PrismaUser): AuthUserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
    }
  }
}
