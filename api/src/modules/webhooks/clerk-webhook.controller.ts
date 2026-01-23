import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ClerkWebhookService } from './clerk-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    // Get raw body - need to configure Express to preserve it
    const payload =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const event = await this.clerkWebhookService.verifyWebhook(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    try {
      await this.clerkWebhookService.handleEvent(event);
    } catch (error) {
      console.error(`Error handling webhook ${event.type}:`, error);
      // Return 200 to acknowledge receipt, but log the error
    }

    return { received: true };
  }
}
