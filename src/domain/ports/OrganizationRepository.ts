import type { Organization } from '../entities/Organization.js'

export interface CreateOrganizationParams {
  name: string
  ownerId: string
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>
  findByOwnerId(ownerId: string): Promise<Organization[]>
  findByUserId(userId: string): Promise<Organization[]>
  create(params: CreateOrganizationParams): Promise<Organization>
  update(
    id: string,
    data: Partial<Pick<Organization, 'name'>>,
  ): Promise<Organization>
  delete(id: string): Promise<void>
}
