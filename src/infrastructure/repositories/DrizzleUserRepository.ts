import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  UserRepository,
  CreateUserParams,
} from '../../domain/ports/UserRepository.js'
import { User } from '../../domain/entities/User.js'
import { users } from '../database/schema.js'

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: AppDatabase) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!row) return null

    return User.reconstitute({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!row) return null

    return User.reconstitute({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async create(params: CreateUserParams): Promise<User> {
    const user = User.create({
      email: params.email,
      passwordHash: params.passwordHash,
      name: params.name,
    })

    const [row] = await this.db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .returning()

    return User.reconstitute({
      id: row!.id,
      email: row!.email,
      passwordHash: row!.passwordHash,
      name: row!.name ?? undefined,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    })
  }

  async update(
    id: string,
    data: Partial<Pick<User, 'name' | 'passwordHash'>>,
  ): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    if (!row) throw new Error('User not found')

    return User.reconstitute({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id))
  }
}
