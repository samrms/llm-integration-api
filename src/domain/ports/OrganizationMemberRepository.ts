import type { OrganizationMember } from '../entities/OrganizationMember.js'
import type { UserRole } from '../entities/User.js'

export interface AddMemberParams {
  organizationId: string
  userId: string
  role: UserRole
}

export interface OrganizationMemberRepository {
  findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null>
  findByOrganizationId(organizationId: string): Promise<OrganizationMember[]>
  findByUserId(userId: string): Promise<OrganizationMember[]>
  add(params: AddMemberParams): Promise<OrganizationMember>
  updateRole(id: string, role: UserRole): Promise<OrganizationMember>
  remove(id: string): Promise<void>
  countByOrganizationId(organizationId: string): Promise<number>
}
