import { Module, forwardRef } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersAdminController } from "./users-admin.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { AdminSeederService } from "./admin-seeder.service";
import { DatabaseModule } from "../../database";
import { MaiaModule } from "../maia/maia.module";

@Module({
  imports: [DatabaseModule, forwardRef(() => MaiaModule)],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService, UsersRepository, AdminSeederService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
