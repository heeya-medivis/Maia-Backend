import { Module, forwardRef } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkWebhookService } from './clerk-webhook.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [ClerkWebhookController],
  providers: [ClerkWebhookService],
})
export class WebhooksModule {}
