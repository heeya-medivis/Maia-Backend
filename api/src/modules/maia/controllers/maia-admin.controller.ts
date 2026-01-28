import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MaiaModelsService } from '../services/maia-models.service';
import { MaiaPromptsService } from '../services/maia-prompts.service';
import { UserMaiaAccessService } from '../services/user-maia-access.service';
import { CreateMaiaModelDto, UpdateMaiaModelDto, MaiaPromptDto } from '../dto';
import { User } from '../../../database/schema';

/**
 * MAIA Admin Controller
 * Matches C# MAIAModelsController (admin panel operations)
 * Used by Next.js web admin for managing models
 */
@ApiTags('MAIA Admin')
@ApiBearerAuth()
@Controller('api/admin/maia')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MaiaAdminController {
  constructor(
    private readonly modelsService: MaiaModelsService,
    private readonly promptsService: MaiaPromptsService,
    private readonly userAccessService: UserMaiaAccessService,
  ) {}

  // ========================
  // Model CRUD Operations
  // ========================

  /**
   * GET /api/admin/maia/models
   * List all models (for admin index page)
   * Matches C# MAIAModelsController.Index()
   */
  @Get('models')
  @ApiOperation({ summary: 'List all MAIA models' })
  async listModels() {
    return this.modelsService.findAll();
  }

  /**
   * GET /api/admin/maia/models/:id
   * Get model with all relations (for manage page)
   * Matches C# MAIAModelsController.Manage()
   */
  @Get('models/:id')
  @ApiOperation({ summary: 'Get MAIA model with relations' })
  async getModel(@Param('id') id: string) {
    return this.modelsService.findByIdWithRelations(id);
  }

  /**
   * POST /api/admin/maia/models
   * Create a new model
   * Matches C# MAIAModelsController.Create()
   */
  @Post('models')
  @ApiOperation({ summary: 'Create a new MAIA model' })
  async createModel(
    @Body() dto: CreateMaiaModelDto,
    @CurrentUser() user: User,
  ) {
    return this.modelsService.create(
      {
        modelName: dto.modelName,
        modelDisplayName: dto.modelDisplayName,
        modelPriority: dto.modelPriority,
        modelCategory: this.mapModelCategory(dto.modelCategory),
        provider: this.mapProvider(dto.provider),
        pricing: dto.pricing,
        isActive: dto.isActive,
        hostProvider: dto.hostProvider ? this.mapHostProvider(dto.hostProvider) : undefined,
        serverIp: dto.serverIp,
      },
      user.id,
    );
  }

  /**
   * PUT /api/admin/maia/models/:id
   * Update a model
   * Matches C# MAIAModelsController.Edit()
   */
  @Put('models/:id')
  @ApiOperation({ summary: 'Update a MAIA model' })
  async updateModel(
    @Param('id') id: string,
    @Body() dto: UpdateMaiaModelDto,
    @CurrentUser() user: User,
  ) {
    return this.modelsService.update(
      id,
      {
        modelName: dto.modelName,
        modelDisplayName: dto.modelDisplayName,
        modelPriority: dto.modelPriority,
        modelCategory: this.mapModelCategory(dto.modelCategory),
        provider: this.mapProvider(dto.provider),
        pricing: dto.pricing,
        isActive: dto.isActive,
        hostProvider: dto.hostProvider ? this.mapHostProvider(dto.hostProvider) : undefined,
        serverIp: dto.serverIp,
      },
      user.id,
    );
  }

  /**
   * DELETE /api/admin/maia/models/:id
   * Delete a model
   * Matches C# MAIAModelsController.Delete()
   */
  @Delete('models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a MAIA model' })
  async deleteModel(@Param('id') id: string, @CurrentUser() user: User) {
    await this.modelsService.softDelete(id, user.id);
  }

  // ========================
  // Prompt Operations
  // ========================

  /**
   * POST /api/admin/maia/models/:modelId/prompts
   * Create a new prompt
   * Matches C# MAIAModelsController.CreatePrompt()
   */
  @Post('models/:modelId/prompts')
  @ApiOperation({ summary: 'Create a new prompt for a model' })
  async createPrompt(
    @Param('modelId') modelId: string,
    @Body() dto: MaiaPromptDto,
    @CurrentUser() user: User,
  ) {
    return this.promptsService.create(modelId, dto, user.id);
  }

  /**
   * PUT /api/admin/maia/prompts/:promptId
   * Update a prompt
   * Matches C# MAIAModelsController.UpdatePrompt()
   */
  @Put('prompts/:promptId')
  @ApiOperation({ summary: 'Update a prompt' })
  async updatePrompt(
    @Param('promptId') promptId: string,
    @Body() dto: MaiaPromptDto,
    @CurrentUser() user: User,
  ) {
    return this.promptsService.update(promptId, dto, user.id);
  }

  /**
   * DELETE /api/admin/maia/prompts/:promptId
   * Delete a prompt
   * Matches C# MAIAModelsController.DeletePrompt()
   */
  @Delete('prompts/:promptId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a prompt' })
  async deletePrompt(
    @Param('promptId') promptId: string,
    @CurrentUser() user: User,
  ) {
    await this.promptsService.softDelete(promptId, user.id);
  }

  // ========================
  // User Access Operations
  // ========================

  /**
   * GET /api/admin/maia/models/:modelId/available-users
   * Get users without access to this model
   * Matches C# MAIAModelsController.GetAvailableUsers()
   */
  @Get('models/:modelId/available-users')
  @ApiOperation({ summary: 'Get users without access to this model' })
  async getAvailableUsers(@Param('modelId') modelId: string) {
    return this.userAccessService.getAvailableUsers(modelId);
  }

  /**
   * POST /api/admin/maia/models/:modelId/access
   * Grant or revoke user access
   * Matches C# MAIAModelsController.ManageUserAccess()
   */
  @Post('models/:modelId/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant or revoke user access to a model' })
  async manageUserAccess(
    @Param('modelId') modelId: string,
    @Body() body: { userId: string; grantAccess: boolean },
    @CurrentUser() user: User,
  ) {
    return this.userAccessService.manageAccess(
      modelId,
      body.userId,
      body.grantAccess,
      user.id,
    );
  }

  // Helper methods for enum mapping
  private mapModelCategory(category: number): string {
    const map: Record<number, string> = {
      0: 'balanced',
      1: 'thinking',
      2: 'live',
    };
    return map[category] ?? 'balanced';
  }

  private mapProvider(provider: number): string {
    const map: Record<number, string> = {
      0: 'invalid',
      1: 'gcloud',
      2: 'openai',
      3: 'self',
    };
    return map[provider] ?? 'invalid';
  }

  private mapHostProvider(provider: number): string {
    const map: Record<number, string> = {
      0: 'invalid',
      1: 'aws_ec2',
    };
    return map[provider] ?? 'invalid';
  }
}
