import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DATABASE_CONNECTION, Database } from "../../../database";
import {
  maiaModels,
  MaiaModel,
  NewMaiaModel,
  maiaHosts,
  maiaPrompts,
  userMaiaAccess,
  users,
} from "../../../database/schema";
import { nanoid } from "nanoid";

export interface MaiaModelWithModifier extends MaiaModel {
  modifiedByName: string | null;
}

@Injectable()
export class MaiaModelsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll(): Promise<MaiaModelWithModifier[]> {
    // Create aliases for joining users table twice
    const modifiedByUser = alias(users, "modified_by_user");
    const createdByUser = alias(users, "created_by_user");

    const results = await this.db
      .select({
        model: maiaModels,
        modifiedByFirstName: modifiedByUser.firstName,
        modifiedByLastName: modifiedByUser.lastName,
        modifiedByEmail: modifiedByUser.email,
        createdByFirstName: createdByUser.firstName,
        createdByLastName: createdByUser.lastName,
        createdByEmail: createdByUser.email,
      })
      .from(maiaModels)
      .leftJoin(modifiedByUser, eq(maiaModels.modifiedById, modifiedByUser.id))
      .leftJoin(createdByUser, eq(maiaModels.createdById, createdByUser.id))
      .where(eq(maiaModels.isDeleted, false))
      .orderBy(desc(maiaModels.isActive), asc(maiaModels.modelName));

    return results.map((r) => {
      // Use modifier name if available, otherwise fall back to creator
      const modifierName =
        r.modifiedByFirstName && r.modifiedByLastName
          ? `${r.modifiedByFirstName} ${r.modifiedByLastName}`
          : r.modifiedByEmail;

      const creatorName =
        r.createdByFirstName && r.createdByLastName
          ? `${r.createdByFirstName} ${r.createdByLastName}`
          : r.createdByEmail;

      return {
        ...r.model,
        modifiedByName: modifierName ?? creatorName ?? null,
      };
    });
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
        and(
          eq(maiaModels.modelName, modelName),
          eq(maiaModels.isDeleted, false),
        ),
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
      .where(and(eq(maiaHosts.maiaModelId, id), eq(maiaHosts.isDeleted, false)))
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

  async create(data: Omit<NewMaiaModel, "id">): Promise<MaiaModel> {
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

  /**
   * Find all active models with a specific priority
   * Used for auto-granting access to new users
   */
  async findActiveByPriority(priority: number): Promise<MaiaModel[]> {
    return this.db
      .select()
      .from(maiaModels)
      .where(
        and(
          eq(maiaModels.isActive, true),
          eq(maiaModels.isDeleted, false),
          eq(maiaModels.modelPriority, priority),
        ),
      );
  }

  /**
   * Find one active model per category (balanced, thinking, live)
   * Returns the model with the lowest priority number in each category
   * Used for auto-granting access when no priority-1 models exist
   */
  async findOneActivePerCategory(): Promise<MaiaModel[]> {
    const categories = ["balanced", "thinking", "live"] as const;
    const result: MaiaModel[] = [];

    for (const category of categories) {
      const [model] = await this.db
        .select()
        .from(maiaModels)
        .where(
          and(
            eq(maiaModels.isActive, true),
            eq(maiaModels.isDeleted, false),
            eq(maiaModels.modelCategory, category),
          ),
        )
        .orderBy(asc(maiaModels.modelPriority))
        .limit(1);

      if (model) {
        result.push(model);
      }
    }

    return result;
  }
}
