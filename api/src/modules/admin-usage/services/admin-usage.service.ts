import { Injectable } from "@nestjs/common";
import {
  AdminUsageRepository,
  OverallStats,
  UserUsageStats,
  OrganizationUsageStats,
  UserDetailData,
  OrganizationDetailData,
} from "../repositories/admin-usage.repository";

@Injectable()
export class AdminUsageService {
  constructor(private readonly repository: AdminUsageRepository) {}

  /**
   * Get overall usage statistics
   */
  async getOverallStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<OverallStats> {
    return this.repository.getOverallStats(startDate, endDate);
  }

  /**
   * Get usage statistics grouped by user
   */
  async getUsageByUser(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserUsageStats[]> {
    return this.repository.getUsageByUser(startDate, endDate);
  }

  /**
   * Get usage statistics grouped by organization
   */
  async getUsageByOrganization(
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrganizationUsageStats[]> {
    return this.repository.getUsageByOrganization(startDate, endDate);
  }

  /**
   * Get detailed usage data for a specific user
   */
  async getUserDetail(userId: string): Promise<UserDetailData | null> {
    return this.repository.getUserDetail(userId);
  }

  /**
   * Get detailed usage data for a specific organization
   */
  async getOrganizationDetail(
    organizationName: string,
  ): Promise<OrganizationDetailData | null> {
    return this.repository.getOrganizationDetail(organizationName);
  }
}
