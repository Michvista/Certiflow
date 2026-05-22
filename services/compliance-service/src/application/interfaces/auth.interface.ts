export interface AuthUserRecord {
  id: string
  name: string
  email: string
  password: string
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>
  create(input: { name: string; email: string; password: string }): Promise<AuthUserRecord>
}
