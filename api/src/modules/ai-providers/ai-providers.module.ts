import { Module } from '@nestjs/common';
import { GCloudController } from './gcloud/gcloud.controller';
import { GCloudService } from './gcloud/gcloud.service';
import { OpenAIController } from './openai/openai.controller';
import { OpenAIService } from './openai/openai.service';

@Module({
  controllers: [GCloudController, OpenAIController],
  providers: [GCloudService, OpenAIService],
  exports: [GCloudService, OpenAIService],
})
export class AiProvidersModule {}
