import { Injectable, Inject } from '@nestjs/common';
import { eq, and, not } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { userMaiaAccess, users } from '../../../database/schema';
import { nanoid } from 'nanoid';

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
    // Get users who either don't have access or have inactive access
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

    if (activeUserIds.length === 0) {
      return this.db
        .select({
          id: users.id,
          fullName: users.firstName,
          email: users.email,
        })
        .from(users);
    }

    // Get all users not in the active access list
    const availableUsers = await this.db
      .select({
        id: users.id,
        fullName: users.firstName,
        email: users.email,
      })
      .from(users)
      .where(not(eq(users.id, activeUserIds[0]))); // Simplified - should use notInArray

    return availableUsers.filter((u) => !activeUserIds.includes(u.id));
  }

  async create(data: Omit<NewUserMaiaAccess, 'id'>): Promise<UserMaiaAccessRecord> {
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
}
