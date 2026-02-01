import { Module, forwardRef } from "@nestjs/common";
import { WorkOSWebhookController } from "./workos-webhook.controller";
import { WorkOSWebhookService } from "./workos-webhook.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [WorkOSWebhookController],
  providers: [WorkOSWebhookService],
})
export class WebhooksModule {}
