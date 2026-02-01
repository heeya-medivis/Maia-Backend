import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database";
import { MaiaApiController } from "./controllers/maia-api.controller";
import { MaiaAdminController } from "./controllers/maia-admin.controller";
import { MaiaSessionController } from "./controllers/maia-session.controller";
import { MaiaModelsService } from "./services/maia-models.service";
import { MaiaPromptsService } from "./services/maia-prompts.service";
import { UserMaiaAccessService } from "./services/user-maia-access.service";
import { MaiaSessionService } from "./services/maia-session.service";
import { AutoGrantAccessService } from "./services/auto-grant-access.service";
import { MaiaModelsRepository } from "./repositories/maia-models.repository";
import { MaiaHostsRepository } from "./repositories/maia-hosts.repository";
import { MaiaPromptsRepository } from "./repositories/maia-prompts.repository";
import { UserMaiaAccessRepository } from "./repositories/user-maia-access.repository";
import { MaiaSessionRepository } from "./repositories/maia-session.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [MaiaApiController, MaiaAdminController, MaiaSessionController],
  providers: [
    // Services
    MaiaModelsService,
    MaiaPromptsService,
    UserMaiaAccessService,
    MaiaSessionService,
    AutoGrantAccessService,
    // Repositories
    MaiaModelsRepository,
    MaiaHostsRepository,
    MaiaPromptsRepository,
    UserMaiaAccessRepository,
    MaiaSessionRepository,
  ],
  exports: [
    MaiaModelsService,
    MaiaPromptsService,
    UserMaiaAccessService,
    MaiaSessionService,
    AutoGrantAccessService,
  ],
})
export class MaiaModule {}
