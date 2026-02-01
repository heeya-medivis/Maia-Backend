import { Injectable, Inject } from "@nestjs/common";
import { eq, sql, desc } from "drizzle-orm";
import { DATABASE_CONNECTION, Database } from "../../../database";
import {
  maiaSessions,
  maiaSessionTurns,
  NewMaiaSession,
  NewMaiaSessionTurn,
  MaiaSession,
  MaiaSessionTurn,
} from "../../../database/schema";

@Injectable()
export class MaiaSessionRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // ========================
  // Session Operations
  // ========================

  async createSession(data: NewMaiaSession): Promise<MaiaSession> {
    const [session] = await this.db
      .insert(maiaSessions)
      .values(data)
      .returning();
    return session;
  }

  async findSessionById(id: string): Promise<MaiaSession | null> {
    const [session] = await this.db
      .select()
      .from(maiaSessions)
      .where(eq(maiaSessions.id, id))
      .limit(1);
    return session ?? null;
  }

  async findSessionsByUserId(userId: string): Promise<MaiaSession[]> {
    return this.db
      .select()
      .from(maiaSessions)
      .where(eq(maiaSessions.userId, userId))
      .orderBy(desc(maiaSessions.startTime));
  }

  async endSession(id: string): Promise<MaiaSession | null> {
    const [session] = await this.db
      .update(maiaSessions)
      .set({
        isActive: false,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maiaSessions.id, id))
      .returning();
    return session ?? null;
  }

  async updateSessionTokenTotals(
    sessionId: string,
    tokenData: {
      inputTextTokens: number;
      inputImageTokens: number;
      inputAudioTokens: number;
      inputTextCachedTokens: number;
      inputImageCachedTokens: number;
      inputAudioCachedTokens: number;
      outputTextTokens: number;
      outputImageTokens: number;
      outputAudioTokens: number;
      outputReasoningTokens: number;
    },
  ): Promise<void> {
    await this.db
      .update(maiaSessions)
      .set({
        totalInputTextTokens: sql`${maiaSessions.totalInputTextTokens} + ${tokenData.inputTextTokens}`,
        totalInputImageTokens: sql`${maiaSessions.totalInputImageTokens} + ${tokenData.inputImageTokens}`,
        totalInputAudioTokens: sql`${maiaSessions.totalInputAudioTokens} + ${tokenData.inputAudioTokens}`,
        totalInputTextCachedTokens: sql`${maiaSessions.totalInputTextCachedTokens} + ${tokenData.inputTextCachedTokens}`,
        totalInputImageCachedTokens: sql`${maiaSessions.totalInputImageCachedTokens} + ${tokenData.inputImageCachedTokens}`,
        totalInputAudioCachedTokens: sql`${maiaSessions.totalInputAudioCachedTokens} + ${tokenData.inputAudioCachedTokens}`,
        totalOutputTextTokens: sql`${maiaSessions.totalOutputTextTokens} + ${tokenData.outputTextTokens}`,
        totalOutputImageTokens: sql`${maiaSessions.totalOutputImageTokens} + ${tokenData.outputImageTokens}`,
        totalOutputAudioTokens: sql`${maiaSessions.totalOutputAudioTokens} + ${tokenData.outputAudioTokens}`,
        totalOutputReasoningTokens: sql`${maiaSessions.totalOutputReasoningTokens} + ${tokenData.outputReasoningTokens}`,
        updatedAt: new Date(),
      })
      .where(eq(maiaSessions.id, sessionId));
  }

  // ========================
  // Turn Operations
  // ========================

  async createTurn(data: NewMaiaSessionTurn): Promise<MaiaSessionTurn> {
    const [turn] = await this.db
      .insert(maiaSessionTurns)
      .values(data)
      .returning();
    return turn;
  }

  async findTurnsBySessionId(sessionId: string): Promise<MaiaSessionTurn[]> {
    return this.db
      .select()
      .from(maiaSessionTurns)
      .where(eq(maiaSessionTurns.sessionId, sessionId))
      .orderBy(maiaSessionTurns.requestTime);
  }

  // ========================
  // Session with Turns
  // ========================

  async findSessionWithTurns(sessionId: string): Promise<{
    session: MaiaSession;
    turns: MaiaSessionTurn[];
  } | null> {
    const session = await this.findSessionById(sessionId);
    if (!session) return null;

    const turns = await this.findTurnsBySessionId(sessionId);
    return { session, turns };
  }
}
