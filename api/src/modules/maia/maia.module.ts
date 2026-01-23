import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database';
import { MaiaApiController } from './controllers/maia-api.controller';
import { MaiaAdminController } from './controllers/maia-admin.controller';
import { MaiaModelsService } from './services/maia-models.service';
import { MaiaPromptsService } from './services/maia-prompts.service';
import { UserMaiaAccessService } from './services/user-maia-access.service';
import { MaiaModelsRepository } from './repositories/maia-models.repository';
import { MaiaHostsRepository } from './repositories/maia-hosts.repository';
import { MaiaPromptsRepository } from './repositories/maia-prompts.repository';
import { UserMaiaAccessRepository } from './repositories/user-maia-access.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [MaiaApiController, MaiaAdminController],
  providers: [
    // Services
    MaiaModelsService,
    MaiaPromptsService,
    UserMaiaAccessService,
    // Repositories
    MaiaModelsRepository,
    MaiaHostsRepository,
    MaiaPromptsRepository,
    UserMaiaAccessRepository,
  ],
  exports: [MaiaModelsService, MaiaPromptsService, UserMaiaAccessService],
})
export class MaiaModule {}
