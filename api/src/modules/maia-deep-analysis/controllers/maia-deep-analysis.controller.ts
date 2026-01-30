import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MaiaDeepAnalysisService } from '../services/maia-deep-analysis.service';
import { CreateDeepAnalysisDto, CreateDeepAnalysisResponseDto } from '../dto';
import { User } from '../../../database/schema';

/**
 * MAIA Deep Analysis Controller
 * Handles deep analysis requests from Unity app
 *
 * Endpoints:
 * - POST /api/maia-deep-analysis           - Create a new analysis
 * - GET  /api/maia-deep-analysis           - Get all analyses for current user
 * - GET  /api/maia-deep-analysis/:id       - Get a specific analysis
 */
@ApiTags('MAIA Deep Analysis')
@ApiBearerAuth()
@Controller('api/maia-deep-analysis')
@UseGuards(JwtAuthGuard)
export class MaiaDeepAnalysisController {
  constructor(private readonly analysisService: MaiaDeepAnalysisService) {}

  /**
   * POST /api/maia-deep-analysis
   * Create a new deep analysis
   * Called by Unity when analysis completes
   */
  @Post()
  @ApiOperation({ summary: 'Create a new deep analysis' })
  async createAnalysis(
    @CurrentUser() user: User,
    @Body() dto: CreateDeepAnalysisDto,
  ): Promise<CreateDeepAnalysisResponseDto> {
    const analysis = await this.analysisService.createAnalysis(user.id, {
      requestTime: new Date(dto.requestTime),
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
    });

    return {
      analysisId: analysis.id,
    };
  }

  /**
   * GET /api/maia-deep-analysis
   * Get all analyses for current user
   */
  @Get()
  @ApiOperation({ summary: 'Get all deep analyses for current user' })
  async getUserAnalyses(@CurrentUser() user: User) {
    return this.analysisService.getUserAnalyses(user.id);
  }

  /**
   * GET /api/maia-deep-analysis/:id
   * Get a specific analysis
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a deep analysis' })
  async getAnalysis(@Param('id') id: string) {
    return this.analysisService.getAnalysis(id);
  }
}
