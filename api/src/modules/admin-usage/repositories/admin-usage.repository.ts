import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, gte, lt, and, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION, Database } from '../../../database';
import {
  users,
  maiaSessions,
  MaiaSession,
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
  totalTokens: number;
}

export interface OrganizationUsageStats {
  organization: string;
  userCount: number;
  chatSessionCount: number;
  chatInputTokens: number;
  chatOutputTokens: number;
  totalTokens: number;
}

export interface OverallStats {
  totalUsers: number;
  totalOrganizations: number;
  totalChatSessions: number;
  totalChatInputTokens: number;
  totalChatOutputTokens: number;
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
  chatSessions: MaiaSession[];
}

export interface OrganizationDetailData {
  organization: string;
  users: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
  chatSessions: MaiaSession[];
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
    if (startDate) chatConditions.push(gte(maiaSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaSessions.startTime, endDate));

    const chatStats = await this.db
      .select({
        totalSessions: sql<number>`count(*)::int`,
        activeSessions: sql<number>`count(*) filter (where ${maiaSessions.isActive} = true)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaSessions.totalInputTextTokens} + ${maiaSessions.totalInputImageTokens} + ${maiaSessions.totalInputAudioTokens} + ${maiaSessions.totalInputTextCachedTokens} + ${maiaSessions.totalInputImageCachedTokens} + ${maiaSessions.totalInputAudioCachedTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaSessions.totalOutputTextTokens} + ${maiaSessions.totalOutputImageTokens} + ${maiaSessions.totalOutputAudioTokens} + ${maiaSessions.totalOutputReasoningTokens}), 0)::int`,
      })
      .from(maiaSessions)
      .where(chatConditions.length > 0 ? and(...chatConditions) : undefined);

    const chatData = chatStats[0] || { totalSessions: 0, activeSessions: 0, inputTokens: 0, outputTokens: 0 };
    const userData = userStats[0] || { totalUsers: 0, totalOrganizations: 0 };

    return {
      totalUsers: userData.totalUsers,
      totalOrganizations: userData.totalOrganizations,
      totalChatSessions: chatData.totalSessions,
      totalChatInputTokens: chatData.inputTokens,
      totalChatOutputTokens: chatData.outputTokens,
      totalTokens: chatData.inputTokens + chatData.outputTokens,
      activeChatSessions: chatData.activeSessions,
    };
  }

  /**
   * Get usage stats grouped by user
   */
  async getUsageByUser(startDate?: Date, endDate?: Date): Promise<UserUsageStats[]> {
    // Build date conditions for chat sessions
    const chatConditions = [];
    if (startDate) chatConditions.push(gte(maiaSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaSessions.startTime, endDate));

    // Get chat stats per user
    const chatStatsByUser = await this.db
      .select({
        userId: maiaSessions.userId,
        sessionCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaSessions.totalInputTextTokens} + ${maiaSessions.totalInputImageTokens} + ${maiaSessions.totalInputAudioTokens} + ${maiaSessions.totalInputTextCachedTokens} + ${maiaSessions.totalInputImageCachedTokens} + ${maiaSessions.totalInputAudioCachedTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaSessions.totalOutputTextTokens} + ${maiaSessions.totalOutputImageTokens} + ${maiaSessions.totalOutputAudioTokens} + ${maiaSessions.totalOutputReasoningTokens}), 0)::int`,
      })
      .from(maiaSessions)
      .where(chatConditions.length > 0 ? and(...chatConditions) : undefined)
      .groupBy(maiaSessions.userId);

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

    // Build lookup map
    const chatMap = new Map(chatStatsByUser.map(s => [s.userId, s]));

    // Combine data
    const results: UserUsageStats[] = allUsers.map(user => {
      const chat = chatMap.get(user.id) || { sessionCount: 0, inputTokens: 0, outputTokens: 0 };

      return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        chatSessionCount: chat.sessionCount,
        chatInputTokens: chat.inputTokens,
        chatOutputTokens: chat.outputTokens,
        totalTokens: chat.inputTokens + chat.outputTokens,
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
    if (startDate) chatConditions.push(gte(maiaSessions.startTime, startDate));
    if (endDate) chatConditions.push(lt(maiaSessions.startTime, endDate));

    // Only include users with an organization (exclude null organizations)
    const hasOrgCondition = sql`${users.organization} is not null`;

    // Get chat stats per organization (join with users to get org)
    const chatStatsByOrg = await this.db
      .select({
        organization: users.organization,
        sessionCount: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${maiaSessions.totalInputTextTokens} + ${maiaSessions.totalInputImageTokens} + ${maiaSessions.totalInputAudioTokens} + ${maiaSessions.totalInputTextCachedTokens} + ${maiaSessions.totalInputImageCachedTokens} + ${maiaSessions.totalInputAudioCachedTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${maiaSessions.totalOutputTextTokens} + ${maiaSessions.totalOutputImageTokens} + ${maiaSessions.totalOutputAudioTokens} + ${maiaSessions.totalOutputReasoningTokens}), 0)::int`,
      })
      .from(maiaSessions)
      .innerJoin(users, eq(maiaSessions.userId, users.id))
      .where(and(hasOrgCondition, ...(chatConditions.length > 0 ? chatConditions : [])))
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
    const userCountMap = new Map(userCountByOrg.map(s => [s.organization!, s.userCount]));

    // Get all unique organizations (filter out any remaining nulls just in case)
    const allOrgs = new Set([
      ...chatStatsByOrg.map(s => s.organization).filter((o): o is string => o !== null),
      ...userCountByOrg.map(s => s.organization).filter((o): o is string => o !== null),
    ]);

    // Combine data
    const results: OrganizationUsageStats[] = Array.from(allOrgs).map(org => {
      const chat = chatMap.get(org) || { sessionCount: 0, inputTokens: 0, outputTokens: 0 };
      const userCount = userCountMap.get(org) || 0;

      return {
        organization: org,
        userCount,
        chatSessionCount: chat.sessionCount,
        chatInputTokens: chat.inputTokens,
        chatOutputTokens: chat.outputTokens,
        totalTokens: chat.inputTokens + chat.outputTokens,
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
      .from(maiaSessions)
      .where(eq(maiaSessions.userId, userId))
      .orderBy(desc(maiaSessions.startTime));

    return {
      user,
      chatSessions,
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
      .from(maiaSessions)
      .where(inArray(maiaSessions.userId, userIds))
      .orderBy(desc(maiaSessions.startTime));

    return {
      organization: organizationName,
      users: orgUsers,
      chatSessions,
    };
  }
}
