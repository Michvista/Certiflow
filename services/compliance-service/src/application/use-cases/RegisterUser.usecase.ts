import bcrypt from 'bcryptjs'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { ValidationError, createLogger } from '@certiflow/shared'
import { RegisterUserDTO } from '../dto/auth.dto'
import { AuthUserRepository } from '../interfaces/auth.interface'

const logger = createLogger('compliance-service:register-user')

export class RegisterUserUseCase {
  constructor(private readonly userRepository: AuthUserRepository) {}

  async execute(input: RegisterUserDTO) {
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()

    if (!name) throw new ValidationError('name is required')
    if (!email) throw new ValidationError('email is required')
    if (!input.password || input.password.length < 8) {
      throw new ValidationError('password must be at least 8 characters')
    }

    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new ValidationError('email is already in use')
    }

    const password = await bcrypt.hash(input.password, 10)
    const user = await this.userRepository.create({ name, email, password })
    const token = createToken(user.id, user.email)

    logger.info('User registered', { userId: user.id, email: user.email })

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    }
  }
}

function createToken(userId: string, email: string) {
  const secret: Secret = process.env.JWT_SECRET || 'fallback-secret'
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

  return jwt.sign(
    { userId, email },
    secret,
    { expiresIn }
  )
}
