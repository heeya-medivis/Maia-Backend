import { Module } from '@nestjs/common';
import { MaiaChatController } from './controllers/maia-chat.controller';
import { MaiaChatService } from './services/maia-chat.service';
import { MaiaChatRepository } from './repositories/maia-chat.repository';

@Module({
  controllers: [MaiaChatController],
  providers: [MaiaChatService, MaiaChatRepository],
  exports: [MaiaChatService],
})
export class MaiaChatModule {}
