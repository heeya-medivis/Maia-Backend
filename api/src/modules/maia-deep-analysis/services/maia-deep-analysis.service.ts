import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { MaiaDeepAnalysisRepository } from '../repositories/maia-deep-analysis.repository';
import { MaiaDeepAnalysis } from '../../../database/schema';

@Injectable()
export class MaiaDeepAnalysisService {
  private readonly logger = new Logger(MaiaDeepAnalysisService.name);

  constructor(private readonly repository: MaiaDeepAnalysisRepository) {}

  /**
   * Create a new deep analysis
   */
  async createAnalysis(
    userId: string,
    data: {
      requestTime: Date;
      inputTokens: number;
      outputTokens: number;
    },
  ): Promise<MaiaDeepAnalysis> {
    const analysis = await this.repository.createAnalysis({
      id: nanoid(),
      userId,
      requestTime: data.requestTime,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
    });

    this.logger.log(
      `Created deep analysis ${analysis.id} for user ${userId} - tokens: in=${data.inputTokens}, out=${data.outputTokens}`,
    );

    return analysis;
  }

  /**
   * Get analysis by ID
   */
  async getAnalysis(analysisId: string): Promise<MaiaDeepAnalysis | null> {
    return this.repository.findAnalysisById(analysisId);
  }

  /**
   * Get all analyses for a user
   */
  async getUserAnalyses(userId: string): Promise<MaiaDeepAnalysis[]> {
    return this.repository.findAnalysesByUserId(userId);
  }

  /**
   * Get analyses for a user within a date range
   */
  async getUserAnalysesInDateRange(
    userId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<MaiaDeepAnalysis[]> {
    return this.repository.findAnalysesByUserIdInDateRange(userId, startDate, endDate);
  }
}
