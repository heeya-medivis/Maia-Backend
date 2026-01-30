import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { DatabaseModule } from '../../database';
import { UsersModule } from '../users/users.module';
import { initializeJwt } from '../../utils/jwt';

// Repositories
import { SessionRepository } from './repositories/session.repository';
import { DevicesRepository } from './repositories/devices.repository';
import { SsoRepository } from './repositories/sso.repository';

// Services
import { SessionService } from './services/session.service';
import { WorkOSService } from './services/workos.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { DevicesController } from './controllers/devices.controller';
import { OAuthController } from './controllers/oauth.controller';
import { SsoController } from './controllers/sso.controller';
import { MagicAuthController } from './controllers/magic-auth.controller';

@Global()
@Module({
  imports: [DatabaseModule, ConfigModule, UsersModule],
  controllers: [AuthController, DevicesController, OAuthController, SsoController, MagicAuthController],
  providers: [
    // Guards
    JwtAuthGuard,
    AdminGuard,
    // Repositories
    SessionRepository,
    DevicesRepository,
    SsoRepository,
    // Services
    SessionService,
    WorkOSService,
  ],
  exports: [
    JwtAuthGuard,
    AdminGuard,
    SessionService,
    DevicesRepository,
    SsoRepository,
    WorkOSService,
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Initialize JWT utilities with config service
    initializeJwt(this.configService);
  }
}
