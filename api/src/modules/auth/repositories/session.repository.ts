import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
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

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const [result] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshToken, refreshToken))
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
          eq(sessions.isRevoked, false),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    const [result] = await this.db
      .update(sessions)
      .set(data)
      .where(eq(sessions.id, id))
      .returning();
    return result ?? null;
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.id, id));
  }

  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.isRevoked, false),
        ),
      )
      .returning({ id: sessions.id });
    return result.length;
  }

  async revokeByDeviceId(deviceId: string): Promise<number> {
    const result = await this.db
      .update(sessions)
      .set({ isRevoked: true })
      .where(
        and(
          eq(sessions.deviceId, deviceId),
          eq(sessions.isRevoked, false),
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
          eq(sessions.isRevoked, true),
          lt(sessions.refreshExpiresAt, new Date()),
        ),
      )
      .returning({ id: sessions.id });
    return result.length;
  }
}
