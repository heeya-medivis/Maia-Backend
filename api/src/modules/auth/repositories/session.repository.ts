import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt, isNull, isNotNull } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { sessions, NewSession, Session } from '../../../database/schema';

@Injectable()
export class SessionRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewSession): Promise<Session> {
    const [result] = await this.db
      .insert(sessions)
      .values(data)
      .returning();
    return result;
  }

  async findById(id: string): Promise<Session | null> {
    const [result] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);
    return result ?? null;
  }

  /**
   * Find session by hashed refresh token (primary lookup method)
   */
  async findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    const [result] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    return result ?? null;
  }

  async findActiveByUserAndDevice(userId: string, deviceId: string): Promise<Session | null> {
    const [result] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.deviceId, deviceId),
          isNull(sessions.revokedAt),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  async update(id: string, data: Partial<Omit<Session, 'id' | 'createdAt'>>): Promise<Session | null> {
    const [result] = await this.db
      .update(sessions)
      .set(data)
      .where(eq(sessions.id, id))
      .returning();
    return result ?? null;
  }

  async revoke(id: string, reason: string = 'logout'): Promise<void> {
    await this.db
      .update(sessions)
      .set({ 
        revokedAt: new Date(),
        revokeReason: reason,
      })
      .where(eq(sessions.id, id));
  }

  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.db
      .update(sessions)
      .set({ 
        revokedAt: new Date(),
        revokeReason: 'logout_all',
      })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({ id: sessions.id });
    return result.length;
  }

  async revokeByDeviceId(deviceId: string): Promise<number> {
    const result = await this.db
      .update(sessions)
      .set({ 
        revokedAt: new Date(),
        revokeReason: 'device_revoked',
      })
      .where(
        and(
          eq(sessions.deviceId, deviceId),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({ id: sessions.id });
    return result.length;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(sessions)
      .where(
        and(
          isNotNull(sessions.revokedAt),
          lt(sessions.expiresAt, new Date()),
        ),
      )
      .returning({ id: sessions.id });
    return result.length;
  }
}
