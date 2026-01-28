import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkOSWebhookService } from './workos-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks/workos')
export class WorkOSWebhookController {
  private readonly logger = new Logger(WorkOSWebhookController.name);

  constructor(private readonly workosWebhookService: WorkOSWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle WorkOS webhook events' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('workos-signature') signature: string,
  ) {
    // Get raw body - need to configure Express to preserve it
    const payload =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!signature) {
      this.logger.warn('Webhook received without signature');
      return { received: false, error: 'Missing signature' };
    }

    const event = await this.workosWebhookService.verifyWebhook(payload, signature);

    try {
      await this.workosWebhookService.handleEvent(event);
    } catch (error) {
      this.logger.error(`Error handling webhook ${event.event}:`, error);
      // Return 200 to acknowledge receipt, but log the error
    }

    return { received: true };
  }
}
