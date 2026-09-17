import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  OrganizationRepository,
  CreateOrganizationParams,
} from '../../domain/ports/OrganizationRepository.js'
import { Organization } from '../../domain/entities/Organization.js'
import { organizations, organizationMembers } from '../database/schema.js'

export class DrizzleOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: AppDatabase) {}

  async findById(id: string): Promise<Organization | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1)

    if (!row) return null

    return Organization.reconstitute({
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findByOwnerId(ownerId: string): Promise<Organization[]> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, ownerId))

    return rows.map((row) =>
      Organization.reconstitute({
        id: row.id,
        name: row.name,
        ownerId: row.ownerId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }

  async findByUserId(userId: string): Promise<Organization[]> {
    const rows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.userId, userId))

    return rows.map((row) =>
      Organization.reconstitute({
        id: row.id,
        name: row.name,
        ownerId: row.ownerId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }

  async create(params: CreateOrganizationParams): Promise<Organization> {
    const org = Organization.create({
      name: params.name,
      ownerId: params.ownerId,
    })

    const [row] = await this.db
      .insert(organizations)
      .values({
        id: org.id,
        name: org.name,
        ownerId: org.ownerId,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })
      .returning()

    return Organization.reconstitute({
      id: row!.id,
      name: row!.name,
      ownerId: row!.ownerId,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    })
  }

  async update(
    id: string,
    data: Partial<Pick<Organization, 'name'>>,
  ): Promise<Organization> {
    const [row] = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning()

    if (!row) throw new Error('Organization not found')

    return Organization.reconstitute({
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(organizations).where(eq(organizations.id, id))
  }
}
