import { Controller, Get, Query, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminUsageService } from '../services/admin-usage.service';
import {
  DateRangeQueryDto,
  OverallStatsResponseDto,
  UserUsageStatsDto,
  OrganizationUsageStatsDto,
  UserDetailResponseDto,
  OrganizationDetailResponseDto,
} from '../dto';

/**
 * Admin Usage Controller
 * Provides aggregated usage statistics for admins
 *
 * Endpoints:
 * - GET /api/admin/usage/stats          - Overall stats
 * - GET /api/admin/usage/by-user        - Usage by user
 * - GET /api/admin/usage/by-organization - Usage by organization
 * - GET /api/admin/usage/user/:userId   - User detail with sessions
 * - GET /api/admin/usage/organization/:organizationName - Organization detail
 */
@ApiTags('Admin Usage')
@ApiBearerAuth()
@Controller('api/admin/usage')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsageController {
  constructor(private readonly usageService: AdminUsageService) {}

  /**
   * GET /api/admin/usage/stats
   * Get overall usage statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get overall usage statistics (admin only)' })
  async getOverallStats(
    @Query() query: DateRangeQueryDto,
  ): Promise<OverallStatsResponseDto> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.usageService.getOverallStats(startDate, endDate);
  }

  /**
   * GET /api/admin/usage/by-user
   * Get usage statistics grouped by user
   */
  @Get('by-user')
  @ApiOperation({ summary: 'Get usage statistics by user (admin only)' })
  async getUsageByUser(
    @Query() query: DateRangeQueryDto,
  ): Promise<UserUsageStatsDto[]> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.usageService.getUsageByUser(startDate, endDate);
  }

  /**
   * GET /api/admin/usage/by-organization
   * Get usage statistics grouped by organization
   */
  @Get('by-organization')
  @ApiOperation({ summary: 'Get usage statistics by organization (admin only)' })
  async getUsageByOrganization(
    @Query() query: DateRangeQueryDto,
  ): Promise<OrganizationUsageStatsDto[]> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.usageService.getUsageByOrganization(startDate, endDate);
  }

  /**
   * GET /api/admin/usage/user/:userId
   * Get detailed usage data for a specific user
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get detailed usage data for a specific user (admin only)' })
  async getUserDetail(
    @Param('userId') userId: string,
  ): Promise<UserDetailResponseDto> {
    const result = await this.usageService.getUserDetail(userId);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return result;
  }

  /**
   * GET /api/admin/usage/organization/:organizationName
   * Get detailed usage data for a specific organization
   */
  @Get('organization/:organizationName')
  @ApiOperation({ summary: 'Get detailed usage data for a specific organization (admin only)' })
  async getOrganizationDetail(
    @Param('organizationName') organizationName: string,
  ): Promise<OrganizationDetailResponseDto> {
    const result = await this.usageService.getOrganizationDetail(organizationName);
    if (!result) {
      throw new NotFoundException('Organization not found');
    }
    return result;
  }
}
