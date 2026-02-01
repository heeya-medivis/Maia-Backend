import { Injectable, Logger } from "@nestjs/common";
import { nanoid } from "nanoid";
import { MaiaSessionRepository } from "../repositories/maia-session.repository";
import {
  NotFoundException,
  BadRequestException,
} from "../../../common/exceptions";
import { MaiaSession, MaiaSessionTurn } from "../../../database/schema";

@Injectable()
export class MaiaSessionService {
  private readonly logger = new Logger(MaiaSessionService.name);

  constructor(private readonly repository: MaiaSessionRepository) {}

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    providerSessionId: string,
    startTime: Date,
  ): Promise<MaiaSession> {
    const session = await this.repository.createSession({
      id: nanoid(),
      userId,
      providerSessionId,
      startTime,
      isActive: true,
    });

    this.logger.log(`Created session ${session.id} for user ${userId}`);
    return session;
  }

  /**
   * Create a turn within a session and update session totals
   */
  async createTurn(
    sessionId: string,
    userId: string,
    data: {
      requestTime: Date;
      responseTime: Date;
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
  ): Promise<MaiaSessionTurn> {
    // Verify session exists and belongs to user
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found", "SESSION_NOT_FOUND");
    }
    if (session.userId !== userId) {
      throw new BadRequestException(
        "Session does not belong to user",
        "SESSION_UNAUTHORIZED",
      );
    }

    // Create the turn
    const turn = await this.repository.createTurn({
      id: nanoid(),
      sessionId,
      requestTime: data.requestTime,
      responseTime: data.responseTime,
      inputTextTokens: data.inputTextTokens,
      inputImageTokens: data.inputImageTokens,
      inputAudioTokens: data.inputAudioTokens,
      inputTextCachedTokens: data.inputTextCachedTokens,
      inputImageCachedTokens: data.inputImageCachedTokens,
      inputAudioCachedTokens: data.inputAudioCachedTokens,
      outputTextTokens: data.outputTextTokens,
      outputImageTokens: data.outputImageTokens,
      outputAudioTokens: data.outputAudioTokens,
      outputReasoningTokens: data.outputReasoningTokens,
    });

    // Update session totals
    await this.repository.updateSessionTokenTotals(sessionId, {
      inputTextTokens: data.inputTextTokens,
      inputImageTokens: data.inputImageTokens,
      inputAudioTokens: data.inputAudioTokens,
      inputTextCachedTokens: data.inputTextCachedTokens,
      inputImageCachedTokens: data.inputImageCachedTokens,
      inputAudioCachedTokens: data.inputAudioCachedTokens,
      outputTextTokens: data.outputTextTokens,
      outputImageTokens: data.outputImageTokens,
      outputAudioTokens: data.outputAudioTokens,
      outputReasoningTokens: data.outputReasoningTokens,
    });

    this.logger.log(
      `Created turn ${turn.id} for session ${sessionId} - tokens: in=${data.inputTextTokens + data.inputImageTokens + data.inputAudioTokens}, out=${data.outputTextTokens + data.outputAudioTokens}`,
    );

    return turn;
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, userId: string): Promise<MaiaSession> {
    // Verify session exists and belongs to user
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException("Session not found", "SESSION_NOT_FOUND");
    }
    if (session.userId !== userId) {
      throw new BadRequestException(
        "Session does not belong to user",
        "SESSION_UNAUTHORIZED",
      );
    }

    const updatedSession = await this.repository.endSession(sessionId);
    this.logger.log(`Ended session ${sessionId}`);
    return updatedSession!;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<MaiaSession | null> {
    return this.repository.findSessionById(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<MaiaSession[]> {
    return this.repository.findSessionsByUserId(userId);
  }

  /**
   * Get session with all turns
   */
  async getSessionWithTurns(sessionId: string): Promise<{
    session: MaiaSession;
    turns: MaiaSessionTurn[];
  } | null> {
    return this.repository.findSessionWithTurns(sessionId);
  }
}
