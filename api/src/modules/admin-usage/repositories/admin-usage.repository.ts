import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, gte, lt, and, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import {
  users,
  maiaChatSessions,
  maiaDeepAnalysis,
  MaiaChatSession,
  MaiaDeepAnalysis,
} from '../../../database/schema';
import { inArray } from 'drizzle-orm';

export interface UserUsageStats {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  chatSessionCount: number;
  chatInputTokens: number;
  chatOutputTokens: number;
  deepAnalysisCount: number;
  deepAnalysisInputTokens: number;
  deepAnalysisOutputTokens: number;
  totalTokens: number;
}

export interface OrganizationUsageStats {
  organization: string;
  userCount: number;
  chatSessionCount: number;
  chatInputTokens: number;
  chatOutputTokens: number;
  deepAnalysisCount: number;
  deepAnalysisInputTokens: number;
  deepAnalysisOutputTokens: number;
  totalTokens: number;
}

export interface OverallStats {
  totalUsers: number;
  totalOrganizations: number;
  totalChatSessions: number;
  totalDeepAnalyses: number;
  totalChatInputTokens: number;
  totalChatOutputTokens: number;
  totalDeepAnalysisInputTokens: number;
  totalDeepAnalysisOutputTokens: number;
  totalTokens: number;
  activeChatSessions: number;
}

export interface UserDetailData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organization: string | null;
  };
  chatSessions: MaiaChatSession[];
  deepAnalyses: MaiaDeepAnalysis[];
}

export interface OrganizationDetailData {
  organization: string;
  users: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
  chatSessions: MaiaChatSession[];
  deepAnalyses: MaiaDeepAnalysis[];
}

@Injectable()
export class AdminUsageRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  /**
   * Get overall usage stats
   */
  async getOverallStats(startDate?: Date, endDate?: Date): Promise<OverallStats> {
    // Get user and org counts
    const userStats = await this.db
      .select({
        totalUsers: sql<number>`count(distinct ${users.id})::int`,
        totalOrganizations: sql<number>`count(distinct ${users.organization})::int`,
      })
      .from(users)
      .where(sql`${users.deletedAt} is null`);

    // Get chat session stats
    const chatConditions = [];
    if (startDate) chatConditions.push(gte(maiaChatSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaChatSessions.startTime, endDate));

    const chatStats = await this.db
      .select({
        totalSessions: sql<number>`count(*)::int`,
        activeSessions: sql<number>`count(*) filter (where ${maiaChatSessions.isActive} = true)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalInputTextTokens} + ${maiaChatSessions.totalInputImageTokens} + ${maiaChatSessions.totalInputAudioTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalOutputTextTokens} + ${maiaChatSessions.totalOutputAudioTokens}), 0)::int`,
      })
      .from(maiaChatSessions)
      .where(chatConditions.length > 0 ? and(...chatConditions) : undefined);

    // Get deep analysis stats
    const analysisConditions = [];
    if (startDate) analysisConditions.push(gte(maiaDeepAnalysis.requestTime, startDate));
    if (endDate) analysisConditions.push(lt(maiaDeepAnalysis.requestTime, endDate));

    const analysisStats = await this.db
      .select({
        totalAnalyses: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.outputTokens}), 0)::int`,
      })
      .from(maiaDeepAnalysis)
      .where(analysisConditions.length > 0 ? and(...analysisConditions) : undefined);

    const chatData = chatStats[0] || { totalSessions: 0, activeSessions: 0, inputTokens: 0, outputTokens: 0 };
    const analysisData = analysisStats[0] || { totalAnalyses: 0, inputTokens: 0, outputTokens: 0 };
    const userData = userStats[0] || { totalUsers: 0, totalOrganizations: 0 };

    return {
      totalUsers: userData.totalUsers,
      totalOrganizations: userData.totalOrganizations,
      totalChatSessions: chatData.totalSessions,
      totalDeepAnalyses: analysisData.totalAnalyses,
      totalChatInputTokens: chatData.inputTokens,
      totalChatOutputTokens: chatData.outputTokens,
      totalDeepAnalysisInputTokens: analysisData.inputTokens,
      totalDeepAnalysisOutputTokens: analysisData.outputTokens,
      totalTokens: chatData.inputTokens + chatData.outputTokens + analysisData.inputTokens + analysisData.outputTokens,
      activeChatSessions: chatData.activeSessions,
    };
  }

  /**
   * Get usage stats grouped by user
   */
  async getUsageByUser(startDate?: Date, endDate?: Date): Promise<UserUsageStats[]> {
    // Build date conditions for chat sessions
    const chatConditions = [];
    if (startDate) chatConditions.push(gte(maiaChatSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaChatSessions.startTime, endDate));

    // Build date conditions for deep analysis
    const analysisConditions = [];
    if (startDate) analysisConditions.push(gte(maiaDeepAnalysis.requestTime, startDate));
    if (endDate) analysisConditions.push(lt(maiaDeepAnalysis.requestTime, endDate));

    // Get chat stats per user
    const chatStatsByUser = await this.db
      .select({
        userId: maiaChatSessions.userId,
        sessionCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalInputTextTokens} + ${maiaChatSessions.totalInputImageTokens} + ${maiaChatSessions.totalInputAudioTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalOutputTextTokens} + ${maiaChatSessions.totalOutputAudioTokens}), 0)::int`,
      })
      .from(maiaChatSessions)
      .where(chatConditions.length > 0 ? and(...chatConditions) : undefined)
      .groupBy(maiaChatSessions.userId);

    // Get analysis stats per user
    const analysisStatsByUser = await this.db
      .select({
        userId: maiaDeepAnalysis.userId,
        analysisCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.outputTokens}), 0)::int`,
      })
      .from(maiaDeepAnalysis)
      .where(analysisConditions.length > 0 ? and(...analysisConditions) : undefined)
      .groupBy(maiaDeepAnalysis.userId);

    // Get all users
    const allUsers = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        organization: users.organization,
      })
      .from(users)
      .where(sql`${users.deletedAt} is null`);

    // Build lookup maps
    const chatMap = new Map(chatStatsByUser.map(s => [s.userId, s]));
    const analysisMap = new Map(analysisStatsByUser.map(s => [s.userId, s]));

    // Combine data
    const results: UserUsageStats[] = allUsers.map(user => {
      const chat = chatMap.get(user.id) || { sessionCount: 0, inputTokens: 0, outputTokens: 0 };
      const analysis = analysisMap.get(user.id) || { analysisCount: 0, inputTokens: 0, outputTokens: 0 };

      return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        chatSessionCount: chat.sessionCount,
        chatInputTokens: chat.inputTokens,
        chatOutputTokens: chat.outputTokens,
        deepAnalysisCount: analysis.analysisCount,
        deepAnalysisInputTokens: analysis.inputTokens,
        deepAnalysisOutputTokens: analysis.outputTokens,
        totalTokens: chat.inputTokens + chat.outputTokens + analysis.inputTokens + analysis.outputTokens,
      };
    });

    // Sort by total tokens descending
    return results.sort((a, b) => b.totalTokens - a.totalTokens);
  }

  /**
   * Get usage stats grouped by organization
   */
  async getUsageByOrganization(startDate?: Date, endDate?: Date): Promise<OrganizationUsageStats[]> {
    // Build date conditions for chat sessions
    const chatConditions = [];
    if (startDate) chatConditions.push(gte(maiaChatSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaChatSessions.startTime, endDate));

    // Build date conditions for deep analysis
    const analysisConditions = [];
    if (startDate) analysisConditions.push(gte(maiaDeepAnalysis.requestTime, startDate));
    if (endDate) analysisConditions.push(lt(maiaDeepAnalysis.requestTime, endDate));

    // Only include users with an organization (exclude null organizations)
    const hasOrgCondition = sql`${users.organization} is not null`;

    // Get chat stats per organization (join with users to get org)
    const chatStatsByOrg = await this.db
      .select({
        organization: users.organization,
        sessionCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalInputTextTokens} + ${maiaChatSessions.totalInputImageTokens} + ${maiaChatSessions.totalInputAudioTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaChatSessions.totalOutputTextTokens} + ${maiaChatSessions.totalOutputAudioTokens}), 0)::int`,
      })
      .from(maiaChatSessions)
      .innerJoin(users, eq(maiaChatSessions.userId, users.id))
      .where(and(hasOrgCondition, ...(chatConditions.length > 0 ? chatConditions : [])))
      .groupBy(users.organization);

    // Get analysis stats per organization
    const analysisStatsByOrg = await this.db
      .select({
        organization: users.organization,
        analysisCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaDeepAnalysis.outputTokens}), 0)::int`,
      })
      .from(maiaDeepAnalysis)
      .innerJoin(users, eq(maiaDeepAnalysis.userId, users.id))
      .where(and(hasOrgCondition, ...(analysisConditions.length > 0 ? analysisConditions : [])))
      .groupBy(users.organization);

    // Get user count per organization (only users with an organization)
    const userCountByOrg = await this.db
      .select({
        organization: users.organization,
        userCount: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(and(sql`${users.deletedAt} is null`, hasOrgCondition))
      .groupBy(users.organization);

    // Build lookup maps (organization is guaranteed to be non-null now)
    const chatMap = new Map(chatStatsByOrg.map(s => [s.organization!, s]));
    const analysisMap = new Map(analysisStatsByOrg.map(s => [s.organization!, s]));
    const userCountMap = new Map(userCountByOrg.map(s => [s.organization!, s.userCount]));

    // Get all unique organizations (filter out any remaining nulls just in case)
    const allOrgs = new Set([
      ...chatStatsByOrg.map(s => s.organization).filter((o): o is string => o !== null),
      ...analysisStatsByOrg.map(s => s.organization).filter((o): o is string => o !== null),
      ...userCountByOrg.map(s => s.organization).filter((o): o is string => o !== null),
    ]);

    // Combine data
    const results: OrganizationUsageStats[] = Array.from(allOrgs).map(org => {
      const chat = chatMap.get(org) || { sessionCount: 0, inputTokens: 0, outputTokens: 0 };
      const analysis = analysisMap.get(org) || { analysisCount: 0, inputTokens: 0, outputTokens: 0 };
      const userCount = userCountMap.get(org) || 0;

      return {
        organization: org,
        userCount,
        chatSessionCount: chat.sessionCount,
        chatInputTokens: chat.inputTokens,
        chatOutputTokens: chat.outputTokens,
        deepAnalysisCount: analysis.analysisCount,
        deepAnalysisInputTokens: analysis.inputTokens,
        deepAnalysisOutputTokens: analysis.outputTokens,
        totalTokens: chat.inputTokens + chat.outputTokens + analysis.inputTokens + analysis.outputTokens,
      };
    });

    // Sort by total tokens descending
    return results.sort((a, b) => b.totalTokens - a.totalTokens);
  }

  /**
   * Get detailed usage data for a specific user
   */
  async getUserDetail(userId: string): Promise<UserDetailData | null> {
    // Get user
    const userResult = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        organization: users.organization,
      })
      .from(users)
      .where(and(eq(users.id, userId), sql`${users.deletedAt} is null`))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];

    // Get chat sessions for this user
    const chatSessions = await this.db
      .select()
      .from(maiaChatSessions)
      .where(eq(maiaChatSessions.userId, userId))
      .orderBy(desc(maiaChatSessions.startTime));

    // Get deep analyses for this user
    const deepAnalyses = await this.db
      .select()
      .from(maiaDeepAnalysis)
      .where(eq(maiaDeepAnalysis.userId, userId))
      .orderBy(desc(maiaDeepAnalysis.requestTime));

    return {
      user,
      chatSessions,
      deepAnalyses,
    };
  }

  /**
   * Get detailed usage data for a specific organization
   */
  async getOrganizationDetail(organizationName: string): Promise<OrganizationDetailData | null> {
    // Users without an organization are not shown in the organization view
    if (organizationName === 'No Organization') {
      return null;
    }

    // Get users in this organization
    const orgUsers = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(eq(users.organization, organizationName), sql`${users.deletedAt} is null`));

    if (orgUsers.length === 0) {
      return null;
    }

    const userIds = orgUsers.map(u => u.id);

    // Get chat sessions for all users in this organization
    const chatSessions = await this.db
      .select()
      .from(maiaChatSessions)
      .where(inArray(maiaChatSessions.userId, userIds))
      .orderBy(desc(maiaChatSessions.startTime));

    // Get deep analyses for all users in this organization
    const deepAnalyses = await this.db
      .select()
      .from(maiaDeepAnalysis)
      .where(inArray(maiaDeepAnalysis.userId, userIds))
      .orderBy(desc(maiaDeepAnalysis.requestTime));

    return {
      organization: organizationName,
      users: orgUsers,
      chatSessions,
      deepAnalyses,
    };
  }
}
