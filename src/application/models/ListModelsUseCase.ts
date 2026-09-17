import type { ModelRepository } from '../../domain/ports/ModelRepository.js'
import type { Model } from '../../domain/entities/Model.js'

export class ListModelsUseCase {
  constructor(private readonly modelRepo: ModelRepository) {}

  async execute(): Promise<Model[]> {
    return this.modelRepo.findAll({ enabled: true })
  }
}
