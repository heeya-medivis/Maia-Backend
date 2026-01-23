import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '../../common/exceptions';

export interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

interface ClerkEmailAddress {
  email_address: string;
  verification?: { status: string };
}

@Injectable()
export class ClerkWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async verifyWebhook(
    payload: string,
    headers: {
      'svix-id'?: string;
      'svix-timestamp'?: string;
      'svix-signature'?: string;
    },
  ): Promise<ClerkWebhookEvent> {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException(
        'CLERK_WEBHOOK_SECRET not configured',
        'WEBHOOK_SECRET_MISSING',
      );
    }

    try {
      const wh = new Webhook(webhookSecret);
      const evt = wh.verify(payload, {
        'svix-id': headers['svix-id'] || '',
        'svix-timestamp': headers['svix-timestamp'] || '',
        'svix-signature': headers['svix-signature'] || '',
      }) as ClerkWebhookEvent;

      return evt;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw new BadRequestException(
        'Webhook verification failed',
        'WEBHOOK_VERIFICATION_FAILED',
      );
    }
  }

  async handleEvent(event: ClerkWebhookEvent): Promise<void> {
    console.log(`Received Clerk webhook: ${event.type}`);

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(event.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleUserCreated(data: Record<string, unknown>): Promise<void> {
    const userId = data.id as string;
    const emailAddresses = data.email_addresses as ClerkEmailAddress[] | undefined;
    const primaryEmail = emailAddresses?.[0];

    await this.usersService.upsertFromClerk({
      id: userId,
      email: primaryEmail?.email_address ?? '',
      firstName: data.first_name as string | null,
      lastName: data.last_name as string | null,
      emailVerified: primaryEmail?.verification?.status === 'verified',
    });

    console.log(`User created: ${userId}`);
  }

  private async handleUserUpdated(data: Record<string, unknown>): Promise<void> {
    const userId = data.id as string;
    const emailAddresses = data.email_addresses as ClerkEmailAddress[] | undefined;
    const primaryEmail = emailAddresses?.[0];

    await this.usersService.upsertFromClerk({
      id: userId,
      email: primaryEmail?.email_address ?? '',
      firstName: data.first_name as string | null,
      lastName: data.last_name as string | null,
      emailVerified: primaryEmail?.verification?.status === 'verified',
    });

    console.log(`User updated: ${userId}`);
  }

  private async handleUserDeleted(data: Record<string, unknown>): Promise<void> {
    const userId = data.id as string;

    await this.usersService.softDelete(userId);

    console.log(`User deleted: ${userId}`);
  }
}
