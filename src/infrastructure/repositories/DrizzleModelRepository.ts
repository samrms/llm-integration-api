import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type { ModelRepository } from '../../domain/ports/ModelRepository.js'
import { Model } from '../../domain/entities/Model.js'
import { models } from '../database/schema.js'

export class DrizzleModelRepository implements ModelRepository {
  constructor(private readonly db: AppDatabase) {}

  private rowToModel(row: typeof models.$inferSelect): Model {
    return Model.reconstitute({
      id: row.id,
      provider: row.provider,
      model: row.model,
      displayName: row.displayName,
      enabled: row.enabled,
      contextWindow: row.contextWindow,
      supportsStreaming: row.supportsStreaming,
      supportsTools: row.supportsTools,
      supportsVision: row.supportsVision,
      inputCostPer1k: Number(row.inputCostPer1k),
      outputCostPer1k: Number(row.outputCostPer1k),
      currency: row.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findById(id: string): Promise<Model | null> {
    const [row] = await this.db
      .select()
      .from(models)
      .where(eq(models.id, id))
      .limit(1)

    if (!row) return null
    return this.rowToModel(row)
  }

  async findByModel(model: string): Promise<Model | null> {
    const [row] = await this.db
      .select()
      .from(models)
      .where(eq(models.model, model))
      .limit(1)

    if (!row) return null
    return this.rowToModel(row)
  }

  async findAll(params?: { enabled?: boolean }): Promise<Model[]> {
    const conditions =
      params?.enabled !== undefined
        ? eq(models.enabled, params.enabled)
        : undefined

    const rows = await this.db.select().from(models).where(conditions)

    return rows.map((row) => this.rowToModel(row))
  }

  async create(model: Model): Promise<Model> {
    const [row] = await this.db
      .insert(models)
      .values({
        id: model.id,
        provider: model.provider,
        model: model.model,
        displayName: model.displayName,
        enabled: model.enabled,
        contextWindow: model.contextWindow,
        supportsStreaming: model.supportsStreaming,
        supportsTools: model.supportsTools,
        supportsVision: model.supportsVision,
        inputCostPer1k: String(model.inputCostPer1k),
        outputCostPer1k: String(model.outputCostPer1k),
        currency: model.currency,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      })
      .returning()

    return this.rowToModel(row!)
  }

  async update(id: string, data: Partial<Model>): Promise<Model> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.provider !== undefined) updateData.provider = data.provider
    if (data.model !== undefined) updateData.model = data.model
    if (data.displayName !== undefined)
      updateData.displayName = data.displayName
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.contextWindow !== undefined)
      updateData.contextWindow = data.contextWindow
    if (data.supportsStreaming !== undefined)
      updateData.supportsStreaming = data.supportsStreaming
    if (data.supportsTools !== undefined)
      updateData.supportsTools = data.supportsTools
    if (data.supportsVision !== undefined)
      updateData.supportsVision = data.supportsVision
    if (data.inputCostPer1k !== undefined)
      updateData.inputCostPer1k = String(data.inputCostPer1k)
    if (data.outputCostPer1k !== undefined)
      updateData.outputCostPer1k = String(data.outputCostPer1k)
    if (data.currency !== undefined) updateData.currency = data.currency

    const [row] = await this.db
      .update(models)
      .set(updateData)
      .where(eq(models.id, id))
      .returning()

    if (!row) throw new Error('Model not found')
    return this.rowToModel(row)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(models).where(eq(models.id, id))
  }
}
