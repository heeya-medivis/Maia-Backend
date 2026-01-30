import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { MaiaChatRepository } from '../repositories/maia-chat.repository';
import { NotFoundException, BadRequestException } from '../../../common/exceptions';
import { MaiaChatSession, MaiaChatTurn } from '../../../database/schema';

@Injectable()
export class MaiaChatService {
  private readonly logger = new Logger(MaiaChatService.name);

  constructor(private readonly repository: MaiaChatRepository) {}

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    providerSessionId: string,
    startTime: Date,
  ): Promise<MaiaChatSession> {
    const session = await this.repository.createSession({
      id: nanoid(),
      userId,
      providerSessionId,
      startTime,
      isActive: true,
    });

    this.logger.log(`Created chat session ${session.id} for user ${userId}`);
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
      outputTextTokens: number;
      outputAudioTokens: number;
    },
  ): Promise<MaiaChatTurn> {
    // Verify session exists and belongs to user
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found', 'SESSION_NOT_FOUND');
    }
    if (session.userId !== userId) {
      throw new BadRequestException(
        'Session does not belong to user',
        'SESSION_UNAUTHORIZED',
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
      outputTextTokens: data.outputTextTokens,
      outputAudioTokens: data.outputAudioTokens,
    });

    // Update session totals
    await this.repository.updateSessionTokenTotals(sessionId, {
      inputTextTokens: data.inputTextTokens,
      inputImageTokens: data.inputImageTokens,
      inputAudioTokens: data.inputAudioTokens,
      outputTextTokens: data.outputTextTokens,
      outputAudioTokens: data.outputAudioTokens,
    });

    this.logger.log(
      `Created turn ${turn.id} for session ${sessionId} - tokens: in=${data.inputTextTokens + data.inputImageTokens + data.inputAudioTokens}, out=${data.outputTextTokens + data.outputAudioTokens}`,
    );

    return turn;
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string, userId: string): Promise<MaiaChatSession> {
    // Verify session exists and belongs to user
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found', 'SESSION_NOT_FOUND');
    }
    if (session.userId !== userId) {
      throw new BadRequestException(
        'Session does not belong to user',
        'SESSION_UNAUTHORIZED',
      );
    }

    const updatedSession = await this.repository.endSession(sessionId);
    this.logger.log(`Ended chat session ${sessionId}`);
    return updatedSession!;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<MaiaChatSession | null> {
    return this.repository.findSessionById(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<MaiaChatSession[]> {
    return this.repository.findSessionsByUserId(userId);
  }

  /**
   * Get session with all turns
   */
  async getSessionWithTurns(sessionId: string): Promise<{
    session: MaiaChatSession;
    turns: MaiaChatTurn[];
  } | null> {
    return this.repository.findSessionWithTurns(sessionId);
  }
}
