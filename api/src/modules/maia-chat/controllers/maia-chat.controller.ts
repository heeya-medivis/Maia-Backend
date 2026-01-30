import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MaiaChatService } from '../services/maia-chat.service';
import {
  CreateSessionDto,
  CreateSessionResponseDto,
  CreateTurnDto,
} from '../dto';
import { User } from '../../../database/schema';

/**
 * MAIA Chat Controller
 * Handles chat session tracking from Unity app
 *
 * Endpoints:
 * - POST /api/maia-chat                - Create a new session
 * - POST /api/maia-chat/:sessionId/turn - Record a turn with token usage
 * - POST /api/maia-chat/:sessionId/end  - End a session
 */
@ApiTags('MAIA Chat')
@ApiBearerAuth()
@Controller('api/maia-chat')
@UseGuards(JwtAuthGuard)
export class MaiaChatController {
  constructor(private readonly chatService: MaiaChatService) {}

  /**
   * POST /api/maia-chat
   * Create a new chat session
   * Called by Unity when a session starts
   */
  @Post()
  @ApiOperation({ summary: 'Create a new chat session' })
  async createSession(
    @CurrentUser() user: User,
    @Body() dto: CreateSessionDto,
  ): Promise<CreateSessionResponseDto> {
    const session = await this.chatService.createSession(
      user.id,
      dto.providerSessionId,
      new Date(dto.startTime),
    );

    return {
      sessionId: session.id,
    };
  }

  /**
   * POST /api/maia-chat/:sessionId/turn
   * Record a turn (request/response pair) with token usage
   * Called by Unity after each model response
   */
  @Post(':sessionId/turn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a turn with token usage' })
  async createTurn(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateTurnDto,
  ): Promise<{ success: boolean }> {
    await this.chatService.createTurn(sessionId, user.id, {
      requestTime: new Date(dto.requestTime),
      responseTime: new Date(dto.responseTime),
      inputTextTokens: dto.inputTextTokens,
      inputImageTokens: dto.inputImageTokens,
      inputAudioTokens: dto.inputAudioTokens,
      outputTextTokens: dto.outputTextTokens,
      outputAudioTokens: dto.outputAudioTokens,
    });

    return { success: true };
  }

  /**
   * POST /api/maia-chat/:sessionId/end
   * End a chat session
   * Called by Unity when a session ends
   */
  @Post(':sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a chat session' })
  async endSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean }> {
    await this.chatService.endSession(sessionId, user.id);
    return { success: true };
  }

  /**
   * GET /api/maia-chat/sessions
   * Get all chat sessions for current user
   */
  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions for current user' })
  async getUserSessions(@CurrentUser() user: User) {
    return this.chatService.getUserSessions(user.id);
  }

  /**
   * GET /api/maia-chat/:sessionId
   * Get a specific session with turns
   */
  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a session with all turns' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionWithTurns(sessionId);
  }
}
