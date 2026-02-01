import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { OpenAIService } from "./openai.service";
import { User } from "../../../database/schema";
import { BadRequestException } from "../../../common/exceptions";

/**
 * OpenAI API Controller
 * Matches C# OpenAIAPIController (/api/OpenAI)
 */
@ApiTags("AI Providers")
@ApiBearerAuth()
@Controller("api/OpenAI")
@UseGuards(JwtAuthGuard)
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * GET /api/OpenAI/Auth
   * Get OpenAI authentication data
   * Matches C# OpenAIAPIController.Auth()
   */
  @Get("Auth")
  @ApiOperation({ summary: "Get OpenAI authentication data" })
  auth(@CurrentUser() user: User) {
    if (!user) {
      throw new BadRequestException("Invalid user", "INVALID_USER");
    }

    return this.openaiService.getAuthData();
  }
}
