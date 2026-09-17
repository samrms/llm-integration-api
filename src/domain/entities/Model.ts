import { BaseEntity } from './BaseEntity.js'

export interface ModelProps {
  id?: string
  provider: string
  model: string
  displayName: string
  enabled: boolean
  contextWindow: number
  supportsStreaming: boolean
  supportsTools: boolean
  supportsVision: boolean
  inputCostPer1k?: number
  outputCostPer1k?: number
  currency?: string
  createdAt?: Date
  updatedAt?: Date
}

export class Model extends BaseEntity {
  public provider: string
  public model: string
  public displayName: string
  public enabled: boolean
  public contextWindow: number
  public supportsStreaming: boolean
  public supportsTools: boolean
  public supportsVision: boolean
  public inputCostPer1k: number
  public outputCostPer1k: number
  public currency: string

  private constructor(props: ModelProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.provider = props.provider
    this.model = props.model
    this.displayName = props.displayName
    this.enabled = props.enabled
    this.contextWindow = props.contextWindow
    this.supportsStreaming = props.supportsStreaming
    this.supportsTools = props.supportsTools
    this.supportsVision = props.supportsVision
    this.inputCostPer1k = props.inputCostPer1k ?? 0
    this.outputCostPer1k = props.outputCostPer1k ?? 0
    this.currency = props.currency ?? 'USD'
  }

  public static create(props: ModelProps): Model {
    if (!props.provider) {
      throw new Error('Provider is required')
    }
    if (!props.model) {
      throw new Error('Model name is required')
    }
    if (!props.displayName) {
      throw new Error('Display name is required')
    }
    return new Model(props)
  }

  public static reconstitute(props: ModelProps & { id: string }): Model {
    return new Model(props)
  }
}
