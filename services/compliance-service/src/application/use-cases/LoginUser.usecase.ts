import bcrypt from 'bcryptjs'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { UnauthorizedError, ValidationError, createLogger } from '@certiflow/shared'
import { LoginUserDTO } from '../dto/auth.dto'
import { AuthUserRepository } from '../interfaces/auth.interface'

const logger = createLogger('compliance-service:login-user')

export class LoginUserUseCase {
  constructor(private readonly userRepository: AuthUserRepository) {}

  async execute(input: LoginUserDTO) {
    const email = input.email.trim().toLowerCase()

    if (!email) throw new ValidationError('email is required')
    if (!input.password) throw new ValidationError('password is required')

    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const passwordMatches = await bcrypt.compare(input.password, user.password)
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const secret: Secret = process.env.JWT_SECRET || 'fallback-secret'
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      secret,
      { expiresIn }
    )

    logger.info('User logged in', { userId: user.id, email: user.email })

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
