import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { devices, Device, NewDevice } from '../../../database/schema';

@Injectable()
export class DevicesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<Device | null> {
    const [result] = await this.db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);
    return result ?? null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Device | null> {
    const [result] = await this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, id),
          eq(devices.userId, userId),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  async findActiveByUserId(userId: string): Promise<Device[]> {
    return this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.userId, userId),
          eq(devices.isActive, true),
        ),
      );
  }

  async findNonRevokedByUserId(userId: string): Promise<Device[]> {
    return this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.userId, userId),
          isNull(devices.revokedAt),
        ),
      );
  }

  async upsert(data: NewDevice): Promise<Device> {
    const [result] = await this.db
      .insert(devices)
      .values(data)
      .onConflictDoUpdate({
        target: devices.id,
        set: {
          userId: data.userId,
          name: data.name,
          deviceType: data.deviceType,
          platform: data.platform,
          appVersion: data.appVersion,
          osVersion: data.osVersion,
          lastActiveAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async update(id: string, data: Partial<NewDevice>): Promise<Device | null> {
    const [result] = await this.db
      .update(devices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning();
    return result ?? null;
  }

  async updateLastActive(id: string): Promise<void> {
    await this.db
      .update(devices)
      .set({
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id));
  }

  async deactivate(id: string): Promise<void> {
    await this.db
      .update(devices)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(devices)
      .set({
        isActive: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id));
  }

  async deactivateAllByUserId(userId: string): Promise<number> {
    const result = await this.db
      .update(devices)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(devices.userId, userId),
          eq(devices.isActive, true),
        ),
      )
      .returning({ id: devices.id });
    return result.length;
  }
}
