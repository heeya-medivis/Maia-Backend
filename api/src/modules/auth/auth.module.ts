import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { DatabaseModule } from '../../database';
import { UsersModule } from '../users/users.module';

// Repositories
import { HandoffRepository } from './repositories/handoff.repository';
import { SessionRepository } from './repositories/session.repository';
import { DevicesRepository } from './repositories/devices.repository';

// Services
import { HandoffService } from './services/handoff.service';
import { SessionService } from './services/session.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { DevicesController } from './controllers/devices.controller';

@Global()
@Module({
  imports: [DatabaseModule, ConfigModule, UsersModule],
  controllers: [AuthController, DevicesController],
  providers: [
    // Guards
    ClerkAuthGuard,
    AdminGuard,
    // Repositories
    HandoffRepository,
    SessionRepository,
    DevicesRepository,
    // Services
    HandoffService,
    SessionService,
  ],
  exports: [
    ClerkAuthGuard,
    AdminGuard,
    SessionService,
    HandoffService,
    DevicesRepository,
  ],
})
export class AuthModule {}
