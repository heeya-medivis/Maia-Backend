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
import { MaiaModelsService } from "../services/maia-models.service";
import { MaiaModelResponseDto, MaiaHostStatusUpdateDto } from "../dto";
import { User } from "../../../database/schema";

/**
 * MAIA API Controller
 * Matches C# MAIAAPIController (/api/maia)
 * Used by Unity app to get model data
 */
@ApiTags("MAIA API")
@ApiBearerAuth()
@Controller("api/maia")
@UseGuards(JwtAuthGuard)
export class MaiaApiController {
  constructor(private readonly modelsService: MaiaModelsService) {}

  /**
   * GET /api/maia/Models
   * Get all models accessible by the current user
   * Matches C# MAIAAPIController.Models()
   */
  @Get("Models")
  @ApiOperation({ summary: "Get accessible MAIA models for current user" })
  async getModels(@CurrentUser() user: User): Promise<MaiaModelResponseDto[]> {
    return this.modelsService.getAccessibleModels(user.id);
  }

  /**
   * POST /api/maia/models/:modelName/status
   * Set model status (activate/deactivate) for self-hosted models
   * Matches C# MAIAAPIController.SetStatus()
   */
  @Post("models/:modelName/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Set model active status (self-hosted models only)",
  })
  async setStatus(
    @Param("modelName") modelName: string,
    @Body() dto: MaiaHostStatusUpdateDto,
  ): Promise<{ message: string }> {
    return this.modelsService.setStatus(modelName, {
      isActive: dto.isActive,
      hostProvider: dto.hostProvider,
      serverIp: dto.serverIp,
    });
  }
}
