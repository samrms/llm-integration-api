import type { Model } from '../entities/Model.js'

export interface ModelRepository {
  findById(id: string): Promise<Model | null>
  findByModel(model: string): Promise<Model | null>
  findAll(params?: { enabled?: boolean }): Promise<Model[]>
  create(model: Model): Promise<Model>
  update(id: string, data: Partial<Model>): Promise<Model>
  delete(id: string): Promise<void>
}
