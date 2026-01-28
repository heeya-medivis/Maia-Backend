import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { maiaPrompts, MaiaPrompt, NewMaiaPrompt, PromptType } from '../../../database/schema';
import { nanoid } from 'nanoid';

@Injectable()
export class MaiaPromptsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<MaiaPrompt | null> {
    const [prompt] = await this.db
      .select()
      .from(maiaPrompts)
      .where(and(eq(maiaPrompts.id, id), eq(maiaPrompts.isDeleted, false)))
      .limit(1);
    return prompt ?? null;
  }

  async findByModelId(maiaModelId: string): Promise<MaiaPrompt[]> {
    return this.db
      .select()
      .from(maiaPrompts)
      .where(
        and(
          eq(maiaPrompts.maiaModelId, maiaModelId),
          eq(maiaPrompts.isDeleted, false),
        ),
      );
  }

  async findActiveByModelIdAndType(
    maiaModelId: string,
    type: PromptType,
  ): Promise<MaiaPrompt | null> {
    const [prompt] = await this.db
      .select()
      .from(maiaPrompts)
      .where(
        and(
          eq(maiaPrompts.maiaModelId, maiaModelId),
          eq(maiaPrompts.type, type),
          eq(maiaPrompts.isActive, true),
          eq(maiaPrompts.isDeleted, false),
        ),
      )
      .limit(1);
    return prompt ?? null;
  }

  async create(data: Omit<NewMaiaPrompt, 'id'>): Promise<MaiaPrompt> {
    const [prompt] = await this.db
      .insert(maiaPrompts)
      .values({
        id: nanoid(),
        ...data,
      })
      .returning();
    return prompt;
  }

  async update(
    id: string,
    data: Partial<NewMaiaPrompt>,
    modifiedById?: string,
  ): Promise<MaiaPrompt | null> {
    const [prompt] = await this.db
      .update(maiaPrompts)
      .set({
        ...data,
        modifiedById,
        modifiedDateTime: new Date(),
      })
      .where(eq(maiaPrompts.id, id))
      .returning();
    return prompt ?? null;
  }

  async softDelete(id: string, deletedById: string): Promise<void> {
    await this.db
      .update(maiaPrompts)
      .set({
        isDeleted: true,
        deletedDateTime: new Date(),
        deletedById,
      })
      .where(eq(maiaPrompts.id, id));
  }

  /**
   * Deactivate all prompts of a specific type for a model
   * Used when activating a new prompt (only one active per type)
   */
  async deactivateByModelIdAndType(
    maiaModelId: string,
    type: PromptType,
    modifiedById: string,
    excludeId?: string,
  ): Promise<void> {
    const conditions = [
      eq(maiaPrompts.maiaModelId, maiaModelId),
      eq(maiaPrompts.type, type),
      eq(maiaPrompts.isActive, true),
    ];

    await this.db
      .update(maiaPrompts)
      .set({
        isActive: false,
        modifiedById,
        modifiedDateTime: new Date(),
      })
      .where(
        excludeId
          ? and(...conditions, eq(maiaPrompts.id, excludeId))
          : and(...conditions),
      );
  }
}
