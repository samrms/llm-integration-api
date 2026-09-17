import { BaseEntity } from './BaseEntity.js'

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface UserProps {
  id?: string
  email: string
  passwordHash: string
  name?: string
  createdAt?: Date
  updatedAt?: Date
}

export class User extends BaseEntity {
  public email: string
  public passwordHash: string
  public name: string | null

  private constructor(props: UserProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.email = props.email.toLowerCase()
    this.passwordHash = props.passwordHash
    this.name = props.name ?? null
  }

  public static create(props: UserProps): User {
    if (!props.email || props.email.length === 0) {
      throw new Error('Email is required')
    }
    if (!props.passwordHash || props.passwordHash.length === 0) {
      throw new Error('Password hash is required')
    }
    return new User(props)
  }

  public static reconstitute(props: UserProps & { id: string }): User {
    return new User(props)
  }
}
