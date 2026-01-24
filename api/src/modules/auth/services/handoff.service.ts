import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { HandoffRepository } from '../repositories/handoff.repository';
import { DeviceHandoffCode } from '../../../database/schema';

// Configuration - Security hardened values
const HANDOFF_CODE_LENGTH = 21; // ~126 bits entropy (was 12)
const POLL_TOKEN_LENGTH = 32; // ~192 bits entropy for poll secret
const HANDOFF_CODE_EXPIRY_MINUTES = 5;

export interface CreateHandoffCodeInput {
  userId: string;
  deviceId: string;
  clerkSessionId?: string;
  pollToken?: string; // Optional: if provided, use this; otherwise generate new one
}

export interface CreateHandoffCodeResult {
  code: string;
  pollToken: string; // Secret token Unity must provide when polling
  expiresAt: Date;
  deepLink: string;
}

export interface ValidateHandoffCodeInput {
  code: string;
  deviceId: string;
}

export interface PollHandoffInput {
  deviceId: string;
  pollToken: string;
}

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);
  private readonly appScheme: string;

  constructor(
    private readonly handoffRepository: HandoffRepository,
    private readonly configService: ConfigService,
  ) {
    this.appScheme = this.configService.get<string>('APP_SCHEME', 'maia');
  }

  /**
   * Create a handoff code for browser-to-device auth transfer
   */
  async createHandoffCode(input: CreateHandoffCodeInput): Promise<CreateHandoffCodeResult> {
    const code = nanoid(HANDOFF_CODE_LENGTH);
    // Use provided pollToken or generate a new one
    const pollToken = input.pollToken ?? nanoid(POLL_TOKEN_LENGTH);
    const expiresAt = new Date(Date.now() + HANDOFF_CODE_EXPIRY_MINUTES * 60 * 1000);

    await this.handoffRepository.create({
      code,
      pollToken,
      userId: input.userId,
      deviceId: input.deviceId,
      clerkSessionId: input.clerkSessionId ?? null,
      expiresAt,
    });

    const deepLink = `${this.appScheme}://auth/callback?code=${code}`;

    this.logger.log(`Created handoff code for device ${input.deviceId}`);

    return {
      code,
      pollToken,
      expiresAt,
      deepLink,
    };
  }

  /**
   * Validate and consume a handoff code
   * Returns the associated user/device info if valid
   * Throws if invalid, expired, or already used
   */
  async validateAndConsumeHandoffCode(input: ValidateHandoffCodeInput): Promise<DeviceHandoffCode> {
    const handoffCode = await this.handoffRepository.findByCode(input.code);

    if (!handoffCode) {
      throw new Error('Invalid handoff code');
    }

    if (handoffCode.used) {
      throw new Error('Handoff code already used');
    }

    if (handoffCode.expiresAt < new Date()) {
      throw new Error('Handoff code expired');
    }

    if (handoffCode.deviceId !== input.deviceId) {
      this.logger.warn(
        `Device ID mismatch: expected ${handoffCode.deviceId}, got ${input.deviceId}`,
      );
      throw new Error('Device ID mismatch');
    }

    // Mark as used
    await this.handoffRepository.markAsUsed(input.code);

    this.logger.log(`Consumed handoff code for device ${input.deviceId}`);

    return handoffCode;
  }

  /**
   * Clean up unused handoff codes for a device (before creating new one)
   */
  async cleanupDeviceHandoffCodes(deviceId: string): Promise<number> {
    const deleted = await this.handoffRepository.deleteByDeviceId(deviceId);
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} unused handoff codes for device ${deviceId}`);
    }
    return deleted;
  }

  /**
   * Clean up all expired handoff codes (for scheduled cleanup)
   */
  async cleanupExpiredHandoffCodes(): Promise<number> {
    const deleted = await this.handoffRepository.deleteExpired();
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired handoff codes`);
    }
    return deleted;
  }

  /**
   * Find unused handoff code for a device (for polling)
   * Requires pollToken to prevent device_id guessing attacks
   */
  async findUnusedByDeviceIdWithPollToken(input: PollHandoffInput): Promise<DeviceHandoffCode | null> {
    const handoffCode = await this.handoffRepository.findUnusedByDeviceId(input.deviceId);
    
    // Verify poll token matches (constant-time comparison would be ideal but nanoid is random enough)
    if (handoffCode && handoffCode.pollToken !== input.pollToken) {
      this.logger.warn(`Poll token mismatch for device ${input.deviceId}`);
      return null; // Don't reveal that a code exists
    }
    
    return handoffCode;
  }

  /**
   * Find unused handoff code for a device (legacy - no poll token)
   * @deprecated Use findUnusedByDeviceIdWithPollToken instead
   */
  async findUnusedByDeviceId(deviceId: string): Promise<DeviceHandoffCode | null> {
    return this.handoffRepository.findUnusedByDeviceId(deviceId);
  }
}
