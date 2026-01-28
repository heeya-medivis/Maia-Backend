import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '../../common/exceptions';

/**
 * WorkOS Webhook Event Types
 * https://workos.com/docs/events/types
 */
export interface WorkOSWebhookEvent {
  id: string;
  event: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface WorkOSUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  profile_picture_url?: string;
  object: 'user';
}

interface WorkOSOrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: { slug: string };
  status: string;
  object: 'organization_membership';
}

@Injectable()
export class WorkOSWebhookService {
  private readonly logger = new Logger(WorkOSWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Verify WorkOS webhook signature
   * WorkOS uses HMAC-SHA256 for webhook signatures
   * https://workos.com/docs/events/webhooks
   */
  async verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<WorkOSWebhookEvent> {
    const webhookSecret = this.configService.get<string>('WORKOS_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException(
        'WORKOS_WEBHOOK_SECRET not configured',
        'WEBHOOK_SECRET_MISSING',
      );
    }

    try {
      // WorkOS signature format: "t={timestamp},v1={signature}"
      const parts = signature.split(',');
      const timestampPart = parts.find(p => p.startsWith('t='));
      const signaturePart = parts.find(p => p.startsWith('v1='));

      if (!timestampPart || !signaturePart) {
        throw new Error('Invalid signature format');
      }

      const timestamp = timestampPart.slice(2);
      const providedSignature = signaturePart.slice(3);

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      // Timing-safe comparison
      if (!crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      )) {
        throw new Error('Signature mismatch');
      }

      // Check timestamp is within 5 minutes
      const eventTime = parseInt(timestamp, 10) * 1000;
      const now = Date.now();
      if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
        throw new Error('Webhook timestamp too old');
      }

      return JSON.parse(payload) as WorkOSWebhookEvent;
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      throw new BadRequestException(
        'Webhook verification failed',
        'WEBHOOK_VERIFICATION_FAILED',
      );
    }
  }

  /**
   * Handle WorkOS webhook events
   * https://workos.com/docs/events/types
   */
  async handleEvent(event: WorkOSWebhookEvent): Promise<void> {
    this.logger.log(`Received WorkOS webhook: ${event.event}`);

    switch (event.event) {
      // User events
      case 'user.created':
        await this.handleUserCreated(event.data as unknown as WorkOSUser);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data as unknown as WorkOSUser);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(event.data as unknown as { id: string });
        break;

      // SSO events
      case 'connection.activated':
        this.logger.log(`SSO connection activated: ${event.data.id}`);
        break;
      case 'connection.deactivated':
        this.logger.log(`SSO connection deactivated: ${event.data.id}`);
        break;
      case 'connection.deleted':
        this.logger.log(`SSO connection deleted: ${event.data.id}`);
        break;

      // Directory sync events
      case 'dsync.user.created':
        await this.handleDSyncUserCreated(event.data);
        break;
      case 'dsync.user.updated':
        await this.handleDSyncUserUpdated(event.data);
        break;
      case 'dsync.user.deleted':
        await this.handleDSyncUserDeleted(event.data);
        break;

      // Organization membership events
      case 'organization_membership.created':
        await this.handleMembershipCreated(event.data as unknown as WorkOSOrganizationMembership);
        break;
      case 'organization_membership.updated':
        await this.handleMembershipUpdated(event.data as unknown as WorkOSOrganizationMembership);
        break;
      case 'organization_membership.deleted':
        await this.handleMembershipDeleted(event.data as unknown as WorkOSOrganizationMembership);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event.event}`);
    }
  }

  private async handleUserCreated(user: WorkOSUser): Promise<void> {
    await this.usersService.upsertFromWorkOS({
      workosUserId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified,
      imageUrl: user.profile_picture_url,
    });

    this.logger.log(`User created: ${user.id} (${user.email})`);
  }

  private async handleUserUpdated(user: WorkOSUser): Promise<void> {
    await this.usersService.upsertFromWorkOS({
      workosUserId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified,
      imageUrl: user.profile_picture_url,
    });

    this.logger.log(`User updated: ${user.id} (${user.email})`);
  }

  private async handleUserDeleted(data: { id: string }): Promise<void> {
    await this.usersService.softDeleteByWorkOSId(data.id);
    this.logger.log(`User deleted: ${data.id}`);
  }

  private async handleDSyncUserCreated(data: Record<string, unknown>): Promise<void> {
    const emails = data.emails as Array<{ primary: boolean; value: string }> | undefined;
    const primaryEmail = emails?.find(e => e.primary)?.value ?? emails?.[0]?.value;

    if (!primaryEmail) {
      this.logger.warn('DSync user created without email', data);
      return;
    }

    await this.usersService.upsertFromWorkOS({
      workosUserId: data.idp_id as string,
      email: primaryEmail,
      firstName: (data.first_name as string) ?? null,
      lastName: (data.last_name as string) ?? null,
      emailVerified: true, // DSync users are always verified via their IdP
    });

    this.logger.log(`DSync user created: ${data.idp_id} (${primaryEmail})`);
  }

  private async handleDSyncUserUpdated(data: Record<string, unknown>): Promise<void> {
    const emails = data.emails as Array<{ primary: boolean; value: string }> | undefined;
    const primaryEmail = emails?.find(e => e.primary)?.value ?? emails?.[0]?.value;

    if (!primaryEmail) {
      this.logger.warn('DSync user updated without email', data);
      return;
    }

    await this.usersService.upsertFromWorkOS({
      workosUserId: data.idp_id as string,
      email: primaryEmail,
      firstName: (data.first_name as string) ?? null,
      lastName: (data.last_name as string) ?? null,
      emailVerified: true,
    });

    this.logger.log(`DSync user updated: ${data.idp_id} (${primaryEmail})`);
  }

  private async handleDSyncUserDeleted(data: Record<string, unknown>): Promise<void> {
    const idpId = data.idp_id as string;
    await this.usersService.softDeleteByWorkOSId(idpId);
    this.logger.log(`DSync user deleted: ${idpId}`);
  }

  private async handleMembershipCreated(membership: WorkOSOrganizationMembership): Promise<void> {
    this.logger.log(`Organization membership created: ${membership.id} (user: ${membership.user_id}, org: ${membership.organization_id})`);
    // TODO: Handle organization membership if needed
  }

  private async handleMembershipUpdated(membership: WorkOSOrganizationMembership): Promise<void> {
    this.logger.log(`Organization membership updated: ${membership.id} (role: ${membership.role.slug})`);
    // TODO: Handle organization membership role updates if needed
  }

  private async handleMembershipDeleted(membership: WorkOSOrganizationMembership): Promise<void> {
    this.logger.log(`Organization membership deleted: ${membership.id}`);
    // TODO: Handle organization membership removal if needed
  }
}
