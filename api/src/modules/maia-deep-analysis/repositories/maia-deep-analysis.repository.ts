import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, gte, and, lt } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import {
  maiaDeepAnalysis,
  NewMaiaDeepAnalysis,
  MaiaDeepAnalysis,
} from '../../../database/schema';

@Injectable()
export class MaiaDeepAnalysisRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async createAnalysis(data: NewMaiaDeepAnalysis): Promise<MaiaDeepAnalysis> {
    const [analysis] = await this.db
      .insert(maiaDeepAnalysis)
      .values(data)
      .returning();
    return analysis;
  }

  async findAnalysisById(id: string): Promise<MaiaDeepAnalysis | null> {
    const [analysis] = await this.db
      .select()
      .from(maiaDeepAnalysis)
      .where(eq(maiaDeepAnalysis.id, id))
      .limit(1);
    return analysis ?? null;
  }

  async findAnalysesByUserId(userId: string): Promise<MaiaDeepAnalysis[]> {
    return this.db
      .select()
      .from(maiaDeepAnalysis)
      .where(eq(maiaDeepAnalysis.userId, userId))
      .orderBy(desc(maiaDeepAnalysis.createdAt));
  }

  async findAnalysesByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<MaiaDeepAnalysis[]> {
    const conditions = [
      eq(maiaDeepAnalysis.userId, userId),
      gte(maiaDeepAnalysis.createdAt, startDate),
    ];

    if (endDate) {
      conditions.push(lt(maiaDeepAnalysis.createdAt, endDate));
    }

    return this.db
      .select()
      .from(maiaDeepAnalysis)
      .where(and(...conditions))
      .orderBy(desc(maiaDeepAnalysis.createdAt));
  }
}
