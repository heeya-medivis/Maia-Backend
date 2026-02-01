import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DATABASE_CONNECTION, Database } from "../../../database";
import { userMaiaAccess, users } from "../../../database/schema";
import { nanoid } from "nanoid";

export type UserMaiaAccessRecord = typeof userMaiaAccess.$inferSelect;
export type NewUserMaiaAccess = typeof userMaiaAccess.$inferInsert;

@Injectable()
export class UserMaiaAccessRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findByUserAndModel(
    userId: string,
    maiaModelId: string,
  ): Promise<UserMaiaAccessRecord | null> {
    const [access] = await this.db
      .select()
      .from(userMaiaAccess)
      .where(
        and(
          eq(userMaiaAccess.userId, userId),
          eq(userMaiaAccess.maiaModelId, maiaModelId),
        ),
      )
      .limit(1);
    return access ?? null;
  }

  async findByModelId(maiaModelId: string): Promise<UserMaiaAccessRecord[]> {
    return this.db
      .select()
      .from(userMaiaAccess)
      .where(eq(userMaiaAccess.maiaModelId, maiaModelId));
  }

  async findActiveByUserId(userId: string): Promise<UserMaiaAccessRecord[]> {
    return this.db
      .select()
      .from(userMaiaAccess)
      .where(
        and(
          eq(userMaiaAccess.userId, userId),
          eq(userMaiaAccess.isActive, true),
        ),
      );
  }

  /**
   * Get users who don't have active access to a model
   * Used for the "Add User Access" dropdown
   */
  async findUsersWithoutModelAccess(maiaModelId: string) {
    // Get users who have active access to this model
    const usersWithActiveAccess = await this.db
      .select({ userId: userMaiaAccess.userId })
      .from(userMaiaAccess)
      .where(
        and(
          eq(userMaiaAccess.maiaModelId, maiaModelId),
          eq(userMaiaAccess.isActive, true),
        ),
      );

    const activeUserIds = usersWithActiveAccess.map((u) => u.userId);

    // Get all users
    const allUsers = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users);

    // Filter out users who already have access and format the response
    return allUsers
      .filter((u) => !activeUserIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        name:
          u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email,
        email: u.email,
      }));
  }

  /**
   * Get users who have active access to a model (with user details)
   */
  async findUsersWithModelAccess(maiaModelId: string) {
    const accessRecords = await this.db
      .select({
        accessId: userMaiaAccess.id,
        userId: userMaiaAccess.userId,
        isActive: userMaiaAccess.isActive,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(userMaiaAccess)
      .innerJoin(users, eq(userMaiaAccess.userId, users.id))
      .where(
        and(
          eq(userMaiaAccess.maiaModelId, maiaModelId),
          eq(userMaiaAccess.isActive, true),
        ),
      );

    return accessRecords.map((r) => ({
      accessId: r.accessId,
      userId: r.userId,
      name:
        r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : r.email,
      email: r.email,
    }));
  }

  async create(
    data: Omit<NewUserMaiaAccess, "id">,
  ): Promise<UserMaiaAccessRecord> {
    const [access] = await this.db
      .insert(userMaiaAccess)
      .values({
        id: nanoid(),
        ...data,
      })
      .returning();
    return access;
  }

  async update(
    id: string,
    data: Partial<NewUserMaiaAccess>,
    updatedById?: string,
  ): Promise<UserMaiaAccessRecord | null> {
    const [access] = await this.db
      .update(userMaiaAccess)
      .set({
        ...data,
        updatedById,
        updateDateTime: new Date(),
      })
      .where(eq(userMaiaAccess.id, id))
      .returning();
    return access ?? null;
  }

  async grantAccess(
    userId: string,
    maiaModelId: string,
    createdById: string,
  ): Promise<UserMaiaAccessRecord> {
    const existing = await this.findByUserAndModel(userId, maiaModelId);

    if (existing) {
      // Reactivate if exists
      const [updated] = await this.db
        .update(userMaiaAccess)
        .set({
          isActive: true,
          updatedById: createdById,
          updateDateTime: new Date(),
        })
        .where(eq(userMaiaAccess.id, existing.id))
        .returning();
      return updated;
    }

    return this.create({
      userId,
      maiaModelId,
      isActive: true,
      createdById,
    });
  }

  async revokeAccess(
    userId: string,
    maiaModelId: string,
    updatedById: string,
  ): Promise<UserMaiaAccessRecord | null> {
    const existing = await this.findByUserAndModel(userId, maiaModelId);

    if (!existing) return null;

    const [updated] = await this.db
      .update(userMaiaAccess)
      .set({
        isActive: false,
        updatedById,
        updateDateTime: new Date(),
      })
      .where(eq(userMaiaAccess.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Deactivate all user access for a model
   * Used when deleting a model to cascade the deactivation
   */
  async deactivateByModelId(
    maiaModelId: string,
    updatedById?: string,
  ): Promise<void> {
    await this.db
      .update(userMaiaAccess)
      .set({
        isActive: false,
        updatedById,
        updateDateTime: new Date(),
      })
      .where(
        and(
          eq(userMaiaAccess.maiaModelId, maiaModelId),
          eq(userMaiaAccess.isActive, true),
        ),
      );
  }
}
