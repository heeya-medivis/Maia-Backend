import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { GCloudService } from "./gcloud.service";
import { User } from "../../../database/schema";
import { BadRequestException } from "../../../common/exceptions";

/**
 * Google Cloud API Controller
 * Matches C# GCloudAPIController (/api/GCloud)
 */
@ApiTags("AI Providers")
@ApiBearerAuth()
@Controller("api/GCloud")
@UseGuards(JwtAuthGuard)
export class GCloudController {
  constructor(private readonly gcloudService: GCloudService) {}

  /**
   * GET /api/GCloud/Auth
   * Get Google Cloud authentication data
   * Matches C# GCloudAPIController.Auth()
   */
  @Get("Auth")
  @ApiOperation({ summary: "Get Google Cloud authentication data" })
  async auth(@CurrentUser() user: User) {
    if (!user) {
      throw new BadRequestException("Invalid user", "INVALID_USER");
    }

    return this.gcloudService.getAuthData();
  }

  /**
   * POST /api/GCloud/RefreshToken
   * Refresh Google Cloud access token
   * Matches C# GCloudAPIController.RefreshToken()
   */
  @Post("RefreshToken")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh Google Cloud access token" })
  async refreshToken(@CurrentUser() user: User) {
    const { tokenExpiry } = await this.gcloudService.refreshToken();

    return {
      message: "Token refreshed successfully",
      userId: user.id,
      tokenExpiry,
    };
  }
}
