import { Module } from '@nestjs/common';
import { AdminUsageController } from './controllers/admin-usage.controller';
import { AdminUsageService } from './services/admin-usage.service';
import { AdminUsageRepository } from './repositories/admin-usage.repository';

@Module({
  controllers: [AdminUsageController],
  providers: [AdminUsageService, AdminUsageRepository],
  exports: [AdminUsageService],
})
export class AdminUsageModule {}
