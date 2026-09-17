import { BaseEntity } from './BaseEntity.js'

export interface OrganizationProps {
  id?: string
  name: string
  ownerId: string
  createdAt?: Date
  updatedAt?: Date
}

export class Organization extends BaseEntity {
  public name: string
  public ownerId: string

  private constructor(props: OrganizationProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.name = props.name
    this.ownerId = props.ownerId
  }

  public static create(props: OrganizationProps): Organization {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Organization name is required')
    }
    if (!props.ownerId) {
      throw new Error('Owner ID is required')
    }
    return new Organization({ ...props, name: props.name.trim() })
  }

  public static reconstitute(
    props: OrganizationProps & { id: string },
  ): Organization {
    return new Organization(props)
  }
}
