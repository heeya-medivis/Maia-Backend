import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import { deviceHandoffCodes, NewDeviceHandoffCode, DeviceHandoffCode } from '../../../database/schema';

@Injectable()
export class HandoffRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewDeviceHandoffCode): Promise<DeviceHandoffCode> {
    const [result] = await this.db
      .insert(deviceHandoffCodes)
      .values(data)
      .returning();
    return result;
  }

  async findByCode(code: string): Promise<DeviceHandoffCode | null> {
    const [result] = await this.db
      .select()
      .from(deviceHandoffCodes)
      .where(eq(deviceHandoffCodes.code, code))
      .limit(1);
    return result ?? null;
  }

  async findUnusedByDeviceId(deviceId: string): Promise<DeviceHandoffCode | null> {
    const [result] = await this.db
      .select()
      .from(deviceHandoffCodes)
      .where(
        and(
          eq(deviceHandoffCodes.deviceId, deviceId),
          eq(deviceHandoffCodes.used, false),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  async markAsUsed(code: string): Promise<void> {
    await this.db
      .update(deviceHandoffCodes)
      .set({
        used: true,
        usedAt: new Date(),
      })
      .where(eq(deviceHandoffCodes.code, code));
  }

  async deleteByDeviceId(deviceId: string): Promise<number> {
    const result = await this.db
      .delete(deviceHandoffCodes)
      .where(
        and(
          eq(deviceHandoffCodes.deviceId, deviceId),
          eq(deviceHandoffCodes.used, false),
        ),
      )
      .returning({ code: deviceHandoffCodes.code });
    return result.length;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(deviceHandoffCodes)
      .where(lt(deviceHandoffCodes.expiresAt, new Date()))
      .returning({ code: deviceHandoffCodes.code });
    return result.length;
  }
}
