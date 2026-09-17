import { BaseEntity } from './BaseEntity.js'

export interface ConversationProps {
  id?: string
  organizationId: string
  userId: string
  title?: string | null
  model?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export class Conversation extends BaseEntity {
  public organizationId: string
  public userId: string
  public title: string | null
  public model: string | null

  private constructor(props: ConversationProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.organizationId = props.organizationId
    this.userId = props.userId
    this.title = props.title ?? null
    this.model = props.model ?? null
  }

  public static create(props: ConversationProps): Conversation {
    if (!props.organizationId) {
      throw new Error('Organization ID is required')
    }
    if (!props.userId) {
      throw new Error('User ID is required')
    }
    return new Conversation(props)
  }

  public static reconstitute(
    props: ConversationProps & { id: string },
  ): Conversation {
    return new Conversation(props)
  }
}
