import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DATABASE_CONNECTION, Database } from "../../../database";
import { maiaHosts, MaiaHost, NewMaiaHost } from "../../../database/schema";
import { nanoid } from "nanoid";

@Injectable()
export class MaiaHostsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findByModelId(maiaModelId: string): Promise<MaiaHost | null> {
    const [host] = await this.db
      .select()
      .from(maiaHosts)
      .where(
        and(
          eq(maiaHosts.maiaModelId, maiaModelId),
          eq(maiaHosts.isDeleted, false),
        ),
      )
      .limit(1);
    return host ?? null;
  }

  /**
   * Find by model ID including soft-deleted records
   * Used when reactivating a host (like IgnoreQueryFilters in C#)
   */
  async findByModelIdIncludeDeleted(
    maiaModelId: string,
  ): Promise<MaiaHost | null> {
    const [host] = await this.db
      .select()
      .from(maiaHosts)
      .where(eq(maiaHosts.maiaModelId, maiaModelId))
      .limit(1);
    return host ?? null;
  }

  async create(data: Omit<NewMaiaHost, "id">): Promise<MaiaHost> {
    const [host] = await this.db
      .insert(maiaHosts)
      .values({
        id: nanoid(),
        ...data,
      })
      .returning();
    return host;
  }

  async update(
    id: string,
    data: Partial<NewMaiaHost>,
    modifiedById?: string,
  ): Promise<MaiaHost | null> {
    const [host] = await this.db
      .update(maiaHosts)
      .set({
        ...data,
        modifiedById,
        modifiedDateTime: new Date(),
      })
      .where(eq(maiaHosts.id, id))
      .returning();
    return host ?? null;
  }

  async softDelete(id: string, deletedById: string): Promise<void> {
    await this.db
      .update(maiaHosts)
      .set({
        isDeleted: true,
        deletedDateTime: new Date(),
        deletedById,
      })
      .where(eq(maiaHosts.id, id));
  }

  async restore(id: string): Promise<MaiaHost | null> {
    const [host] = await this.db
      .update(maiaHosts)
      .set({
        isDeleted: false,
        deletedById: null,
        deletedDateTime: null,
      })
      .where(eq(maiaHosts.id, id))
      .returning();
    return host ?? null;
  }
}
