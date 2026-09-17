import { BaseEntity } from './BaseEntity.js'
import { UserRole } from './User.js'

export interface OrganizationMemberProps {
  id?: string
  organizationId: string
  userId: string
  role: UserRole
  createdAt?: Date
  updatedAt?: Date
}

export class OrganizationMember extends BaseEntity {
  public organizationId: string
  public userId: string
  public role: UserRole

  private constructor(props: OrganizationMemberProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.organizationId = props.organizationId
    this.userId = props.userId
    this.role = props.role
  }

  public static create(props: OrganizationMemberProps): OrganizationMember {
    if (!props.organizationId) {
      throw new Error('Organization ID is required')
    }
    if (!props.userId) {
      throw new Error('User ID is required')
    }
    return new OrganizationMember(props)
  }

  public static reconstitute(
    props: OrganizationMemberProps & { id: string },
  ): OrganizationMember {
    return new OrganizationMember(props)
  }

  public hasMinimumRole(requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.MEMBER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.OWNER]: 3,
    }
    return roleHierarchy[this.role] >= roleHierarchy[requiredRole]
  }
}
