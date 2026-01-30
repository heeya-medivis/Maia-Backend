import { Module } from '@nestjs/common';
import { MaiaDeepAnalysisController } from './controllers/maia-deep-analysis.controller';
import { MaiaDeepAnalysisService } from './services/maia-deep-analysis.service';
import { MaiaDeepAnalysisRepository } from './repositories/maia-deep-analysis.repository';

@Module({
  controllers: [MaiaDeepAnalysisController],
  providers: [MaiaDeepAnalysisService, MaiaDeepAnalysisRepository],
  exports: [MaiaDeepAnalysisService],
})
export class MaiaDeepAnalysisModule {}
