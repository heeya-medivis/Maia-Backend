import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { DatabaseModule } from './database';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MaiaModule } from './modules/maia/maia.module';
import { AiProvidersModule } from './modules/ai-providers/ai-providers.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    WebhooksModule,
    MaiaModule,
    AiProvidersModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
