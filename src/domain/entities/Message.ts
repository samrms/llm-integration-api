import { BaseEntity } from './BaseEntity.js'

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface MessageProps {
  id?: string
  conversationId: string
  organizationId: string
  role: MessageRole
  content: string
  tokenCount?: number | null
  createdAt?: Date
  updatedAt?: Date
}

export class Message extends BaseEntity {
  public conversationId: string
  public organizationId: string
  public role: MessageRole
  public content: string
  public tokenCount: number | null

  private constructor(props: MessageProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.conversationId = props.conversationId
    this.organizationId = props.organizationId
    this.role = props.role
    this.content = props.content
    this.tokenCount = props.tokenCount ?? null
  }

  public static create(props: MessageProps): Message {
    if (!props.conversationId) {
      throw new Error('Conversation ID is required')
    }
    if (!props.organizationId) {
      throw new Error('Organization ID is required')
    }
    if (!props.content || props.content.length === 0) {
      throw new Error('Message content is required')
    }
    return new Message(props)
  }

  public static reconstitute(props: MessageProps & { id: string }): Message {
    return new Message(props)
  }
}
