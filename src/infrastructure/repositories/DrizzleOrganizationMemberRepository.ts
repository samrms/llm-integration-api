import { eq, and } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  OrganizationMemberRepository,
  AddMemberParams,
} from '../../domain/ports/OrganizationMemberRepository.js'
import { OrganizationMember } from '../../domain/entities/OrganizationMember.js'
import type { UserRole } from '../../domain/entities/User.js'
import { organizationMembers } from '../database/schema.js'

export class DrizzleOrganizationMemberRepository implements OrganizationMemberRepository {
  constructor(private readonly db: AppDatabase) {}

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const [row] = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1)

    if (!row) return null

    return OrganizationMember.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      role: row.role as UserRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    const rows = await this.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))

    return rows.map((row) =>
      OrganizationMember.reconstitute({
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        role: row.role as UserRole,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }

  async findByUserId(userId: string): Promise<OrganizationMember[]> {
    const rows = await this.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))

    return rows.map((row) =>
      OrganizationMember.reconstitute({
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        role: row.role as UserRole,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }

  async add(params: AddMemberParams): Promise<OrganizationMember> {
    const member = OrganizationMember.create({
      organizationId: params.organizationId,
      userId: params.userId,
      role: params.role,
    })

    const [row] = await this.db
      .insert(organizationMembers)
      .values({
        id: member.id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      })
      .returning()

    return OrganizationMember.reconstitute({
      id: row!.id,
      organizationId: row!.organizationId,
      userId: row!.userId,
      role: row!.role as UserRole,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    })
  }

  async updateRole(id: string, role: UserRole): Promise<OrganizationMember> {
    const [row] = await this.db
      .update(organizationMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(organizationMembers.id, id))
      .returning()

    if (!row) throw new Error('Member not found')

    return OrganizationMember.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      role: row.role as UserRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async remove(id: string): Promise<void> {
    await this.db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, id))
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))

    return result ? 1 : 0
  }
}
