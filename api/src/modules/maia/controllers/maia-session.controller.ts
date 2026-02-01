import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { MaiaSessionService } from "../services/maia-session.service";
import {
  CreateSessionDto,
  CreateSessionResponseDto,
  CreateTurnDto,
} from "../dto/maia-session.dto";
import { User } from "../../../database/schema";

/**
 * MAIA Session Controller
 * Handles session tracking from Unity app
 *
 * Endpoints:
 * - POST /api/maia/session                - Create a new session
 * - POST /api/maia/session/:sessionId/turn - Record a turn with token usage
 * - POST /api/maia/session/:sessionId/end  - End a session
 * - GET  /api/maia/session                - Get all sessions for current user
 * - GET  /api/maia/session/:sessionId     - Get a specific session with turns
 */
@ApiTags("MAIA Session")
@ApiBearerAuth()
@Controller("api/maia/session")
@UseGuards(JwtAuthGuard)
export class MaiaSessionController {
  constructor(private readonly sessionService: MaiaSessionService) {}

  /**
   * POST /api/maia/session
   * Create a new session
   * Called by Unity when a session starts
   */
  @Post()
  @ApiOperation({ summary: "Create a new session" })
  async createSession(
    @CurrentUser() user: User,
    @Body() dto: CreateSessionDto,
  ): Promise<CreateSessionResponseDto> {
    const session = await this.sessionService.createSession(
      user.id,
      dto.providerSessionId,
      new Date(dto.startTime),
    );

    return {
      sessionId: session.id,
    };
  }

  /**
   * POST /api/maia/session/:sessionId/turn
   * Record a turn (request/response pair) with token usage
   * Called by Unity after each model response
   */
  @Post(":sessionId/turn")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Record a turn with token usage" })
  async createTurn(
    @CurrentUser() user: User,
    @Param("sessionId") sessionId: string,
    @Body() dto: CreateTurnDto,
  ): Promise<{ success: boolean }> {
    await this.sessionService.createTurn(sessionId, user.id, {
      requestTime: new Date(dto.requestTime),
      responseTime: new Date(dto.responseTime),
      inputTextTokens: dto.inputTextTokens,
      inputImageTokens: dto.inputImageTokens,
      inputAudioTokens: dto.inputAudioTokens,
      inputTextCachedTokens: dto.inputTextCachedTokens,
      inputImageCachedTokens: dto.inputImageCachedTokens,
      inputAudioCachedTokens: dto.inputAudioCachedTokens,
      outputTextTokens: dto.outputTextTokens,
      outputImageTokens: dto.outputImageTokens,
      outputAudioTokens: dto.outputAudioTokens,
      outputReasoningTokens: dto.outputReasoningTokens,
    });

    return { success: true };
  }

  /**
   * POST /api/maia/session/:sessionId/end
   * End a session
   * Called by Unity when a session ends
   */
  @Post(":sessionId/end")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End a session" })
  async endSession(
    @CurrentUser() user: User,
    @Param("sessionId") sessionId: string,
  ): Promise<{ success: boolean }> {
    await this.sessionService.endSession(sessionId, user.id);
    return { success: true };
  }

  /**
   * GET /api/maia/session
   * Get all sessions for current user
   */
  @Get()
  @ApiOperation({ summary: "Get all sessions for current user" })
  async getUserSessions(@CurrentUser() user: User) {
    return this.sessionService.getUserSessions(user.id);
  }

  /**
   * GET /api/maia/session/:sessionId
   * Get a specific session with all turns
   */
  @Get(":sessionId")
  @ApiOperation({ summary: "Get session details with turns" })
  async getSession(@Param("sessionId") sessionId: string) {
    return this.sessionService.getSessionWithTurns(sessionId);
  }
}
