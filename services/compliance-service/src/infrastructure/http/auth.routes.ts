import { Router, Request, Response, NextFunction } from 'express'
import { successResponse } from '@certiflow/shared'
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUser.usecase'
import { LoginUserUseCase } from '../../application/use-cases/LoginUser.usecase'
import { PrismaUserAuthRepository } from '../repositories/PrismaUserAuth.repository'

const router = Router()
const authRepository = new PrismaUserAuthRepository()
const registerUserUseCase = new RegisterUserUseCase(authRepository)
const loginUserUseCase = new LoginUserUseCase(authRepository)

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerUserUseCase.execute(req.body)
    res.status(201).json(successResponse(result, 'Account created successfully'))
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginUserUseCase.execute(req.body)
    res.json(successResponse(result, 'Login successful'))
  } catch (error) {
    next(error)
  }
})

export default router
