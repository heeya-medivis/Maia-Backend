import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import {
  maiaModels,
  MaiaModel,
  NewMaiaModel,
  maiaHosts,
  maiaPrompts,
  userMaiaAccess,
} from '../../../database/schema';
import { nanoid } from 'nanoid';

@Injectable()
export class MaiaModelsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll(): Promise<MaiaModel[]> {
    return this.db
      .select()
      .from(maiaModels)
      .where(eq(maiaModels.isDeleted, false))
      .orderBy(desc(maiaModels.isActive), asc(maiaModels.modelName));
  }

  async findById(id: string): Promise<MaiaModel | null> {
    const [model] = await this.db
      .select()
      .from(maiaModels)
      .where(and(eq(maiaModels.id, id), eq(maiaModels.isDeleted, false)))
      .limit(1);
    return model ?? null;
  }

  async findByName(modelName: string): Promise<MaiaModel | null> {
    const [model] = await this.db
      .select()
      .from(maiaModels)
      .where(
        and(eq(maiaModels.modelName, modelName), eq(maiaModels.isDeleted, false)),
      )
      .limit(1);
    return model ?? null;
  }

  /**
   * Find all active models accessible by a specific user
   * Matches the C# query in MAIAAPIController.Models()
   */
  async findAccessibleByUser(userId: string) {
    const results = await this.db
      .select({
        model: maiaModels,
      })
      .from(maiaModels)
      .innerJoin(userMaiaAccess, eq(userMaiaAccess.maiaModelId, maiaModels.id))
      .where(
        and(
          eq(maiaModels.isActive, true),
          eq(maiaModels.isDeleted, false),
          eq(userMaiaAccess.userId, userId),
          eq(userMaiaAccess.isActive, true),
        ),
      );

    return results.map((r) => r.model);
  }

  /**
   * Find a model with all related data (host, prompts, user access)
   * Used for the Manage page
   */
  async findByIdWithRelations(id: string) {
    const [model] = await this.db
      .select()
      .from(maiaModels)
      .where(and(eq(maiaModels.id, id), eq(maiaModels.isDeleted, false)))
      .limit(1);

    if (!model) return null;

    // Get host
    const [host] = await this.db
      .select()
      .from(maiaHosts)
      .where(
        and(eq(maiaHosts.maiaModelId, id), eq(maiaHosts.isDeleted, false)),
      )
      .limit(1);

    // Get prompts
    const prompts = await this.db
      .select()
      .from(maiaPrompts)
      .where(
        and(eq(maiaPrompts.maiaModelId, id), eq(maiaPrompts.isDeleted, false)),
      );

    // Get user access
    const access = await this.db
      .select()
      .from(userMaiaAccess)
      .where(eq(userMaiaAccess.maiaModelId, id));

    return {
      ...model,
      host: host ?? null,
      prompts,
      userAccess: access,
    };
  }

  async create(data: Omit<NewMaiaModel, 'id'>): Promise<MaiaModel> {
    const [model] = await this.db
      .insert(maiaModels)
      .values({
        id: nanoid(),
        ...data,
      })
      .returning();
    return model;
  }

  async update(
    id: string,
    data: Partial<NewMaiaModel>,
    modifiedById?: string,
  ): Promise<MaiaModel | null> {
    const [model] = await this.db
      .update(maiaModels)
      .set({
        ...data,
        modifiedById,
        modifiedDateTime: new Date(),
      })
      .where(eq(maiaModels.id, id))
      .returning();
    return model ?? null;
  }

  async softDelete(id: string, deletedById: string): Promise<void> {
    await this.db
      .update(maiaModels)
      .set({
        isDeleted: true,
        deletedDateTime: new Date(),
        deletedById,
      })
      .where(eq(maiaModels.id, id));
  }
}
