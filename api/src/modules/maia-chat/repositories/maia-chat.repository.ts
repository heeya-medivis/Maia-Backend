import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import {
  maiaChatSessions,
  maiaChatTurns,
  NewMaiaChatSession,
  NewMaiaChatTurn,
  MaiaChatSession,
  MaiaChatTurn,
} from '../../../database/schema';

@Injectable()
export class MaiaChatRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // ========================
  // Session Operations
  // ========================

  async createSession(data: NewMaiaChatSession): Promise<MaiaChatSession> {
    const [session] = await this.db
      .insert(maiaChatSessions)
      .values(data)
      .returning();
    return session;
  }

  async findSessionById(id: string): Promise<MaiaChatSession | null> {
    const [session] = await this.db
      .select()
      .from(maiaChatSessions)
      .where(eq(maiaChatSessions.id, id))
      .limit(1);
    return session ?? null;
  }

  async findSessionsByUserId(userId: string): Promise<MaiaChatSession[]> {
    return this.db
      .select()
      .from(maiaChatSessions)
      .where(eq(maiaChatSessions.userId, userId))
      .orderBy(desc(maiaChatSessions.startTime));
  }

  async endSession(id: string): Promise<MaiaChatSession | null> {
    const [session] = await this.db
      .update(maiaChatSessions)
      .set({
        isActive: false,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maiaChatSessions.id, id))
      .returning();
    return session ?? null;
  }

  async updateSessionTokenTotals(
    sessionId: string,
    tokenData: {
      inputTextTokens: number;
      inputImageTokens: number;
      inputAudioTokens: number;
      outputTextTokens: number;
      outputAudioTokens: number;
    },
  ): Promise<void> {
    await this.db
      .update(maiaChatSessions)
      .set({
        totalInputTextTokens: sql`${maiaChatSessions.totalInputTextTokens} + ${tokenData.inputTextTokens}`,
        totalInputImageTokens: sql`${maiaChatSessions.totalInputImageTokens} + ${tokenData.inputImageTokens}`,
        totalInputAudioTokens: sql`${maiaChatSessions.totalInputAudioTokens} + ${tokenData.inputAudioTokens}`,
        totalOutputTextTokens: sql`${maiaChatSessions.totalOutputTextTokens} + ${tokenData.outputTextTokens}`,
        totalOutputAudioTokens: sql`${maiaChatSessions.totalOutputAudioTokens} + ${tokenData.outputAudioTokens}`,
        updatedAt: new Date(),
      })
      .where(eq(maiaChatSessions.id, sessionId));
  }

  // ========================
  // Turn Operations
  // ========================

  async createTurn(data: NewMaiaChatTurn): Promise<MaiaChatTurn> {
    const [turn] = await this.db
      .insert(maiaChatTurns)
      .values(data)
      .returning();
    return turn;
  }

  async findTurnsBySessionId(sessionId: string): Promise<MaiaChatTurn[]> {
    return this.db
      .select()
      .from(maiaChatTurns)
      .where(eq(maiaChatTurns.sessionId, sessionId))
      .orderBy(maiaChatTurns.requestTime);
  }

  // ========================
  // Session with Turns
  // ========================

  async findSessionWithTurns(sessionId: string): Promise<{
    session: MaiaChatSession;
    turns: MaiaChatTurn[];
  } | null> {
    const session = await this.findSessionById(sessionId);
    if (!session) return null;

    const turns = await this.findTurnsBySessionId(sessionId);
    return { session, turns };
  }
}
