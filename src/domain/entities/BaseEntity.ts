import { randomUUID } from 'node:crypto'

export abstract class BaseEntity {
  public readonly id: string
  public readonly createdAt: Date
  public updatedAt: Date

  protected constructor(props: {
    id?: string
    createdAt?: Date
    updatedAt?: Date
  }) {
    this.id = props.id ?? randomUUID()
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  public touch(): void {
    this.updatedAt = new Date()
  }
}
