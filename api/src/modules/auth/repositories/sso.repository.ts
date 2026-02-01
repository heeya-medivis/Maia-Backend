import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { DATABASE_CONNECTION, Database } from "../../../database";
import {
  authConnections,
  AuthConnection,
  NewAuthConnection,
  ssoDomains,
  SsoDomain,
  NewSsoDomain,
} from "../../../database/schema";

/**
 * Result of enterprise lookup
 */
export interface EnterpriseLookupResult {
  isEnterprise: boolean;
  connection?: AuthConnection;
  domain?: SsoDomain;
}

@Injectable()
export class SsoRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // ============================================================
  // Auth Connections
  // ============================================================

  /**
   * Get all auth connections
   */
  async findAllConnections(): Promise<AuthConnection[]> {
    return this.db.select().from(authConnections);
  }

  /**
   * Get enabled auth connections
   */
  async findEnabledConnections(): Promise<AuthConnection[]> {
    return this.db
      .select()
      .from(authConnections)
      .where(eq(authConnections.enabled, true));
  }

  /**
   * Find connection by ID
   */
  async findConnectionById(id: string): Promise<AuthConnection | null> {
    const [result] = await this.db
      .select()
      .from(authConnections)
      .where(eq(authConnections.id, id))
      .limit(1);
    return result ?? null;
  }

  /**
   * Find connection by WorkOS connection ID
   */
  async findConnectionByWorkosId(
    workosConnectionId: string,
  ): Promise<AuthConnection | null> {
    const [result] = await this.db
      .select()
      .from(authConnections)
      .where(eq(authConnections.workosConnectionId, workosConnectionId))
      .limit(1);
    return result ?? null;
  }

  /**
   * Create a new auth connection
   */
  async createConnection(
    data: Omit<NewAuthConnection, "id">,
  ): Promise<AuthConnection> {
    const [result] = await this.db
      .insert(authConnections)
      .values({
        ...data,
        id: nanoid(),
      })
      .returning();
    return result;
  }

  /**
   * Update an auth connection
   */
  async updateConnection(
    id: string,
    data: Partial<Omit<AuthConnection, "id" | "createdAt">>,
  ): Promise<AuthConnection | null> {
    const [result] = await this.db
      .update(authConnections)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(authConnections.id, id))
      .returning();
    return result ?? null;
  }

  /**
   * Delete an auth connection (cascades to sso_domains)
   */
  async deleteConnection(id: string): Promise<boolean> {
    const result = await this.db
      .delete(authConnections)
      .where(eq(authConnections.id, id))
      .returning({ id: authConnections.id });
    return result.length > 0;
  }

  // ============================================================
  // SSO Domains
  // ============================================================

  /**
   * Get all SSO domains
   */
  async findAllDomains(): Promise<SsoDomain[]> {
    return this.db.select().from(ssoDomains);
  }

  /**
   * Get SSO domains for a connection
   */
  async findDomainsByConnectionId(connectionId: string): Promise<SsoDomain[]> {
    return this.db
      .select()
      .from(ssoDomains)
      .where(eq(ssoDomains.connectionId, connectionId));
  }

  /**
   * Find domain by exact match
   */
  async findDomainByName(domain: string): Promise<SsoDomain | null> {
    const normalizedDomain = domain.toLowerCase().trim();
    const [result] = await this.db
      .select()
      .from(ssoDomains)
      .where(
        and(
          eq(ssoDomains.domain, normalizedDomain),
          eq(ssoDomains.enabled, true),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  /**
   * Find domain by ID
   */
  async findDomainById(id: string): Promise<SsoDomain | null> {
    const [result] = await this.db
      .select()
      .from(ssoDomains)
      .where(eq(ssoDomains.id, id))
      .limit(1);
    return result ?? null;
  }

  /**
   * Create a new SSO domain mapping
   */
  async createDomain(data: Omit<NewSsoDomain, "id">): Promise<SsoDomain> {
    const [result] = await this.db
      .insert(ssoDomains)
      .values({
        ...data,
        id: nanoid(),
        domain: data.domain.toLowerCase().trim(),
      })
      .returning();
    return result;
  }

  /**
   * Update an SSO domain
   */
  async updateDomain(
    id: string,
    data: Partial<Omit<SsoDomain, "id" | "createdAt">>,
  ): Promise<SsoDomain | null> {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.domain) {
      updateData.domain = data.domain.toLowerCase().trim();
    }
    const [result] = await this.db
      .update(ssoDomains)
      .set(updateData)
      .where(eq(ssoDomains.id, id))
      .returning();
    return result ?? null;
  }

  /**
   * Delete an SSO domain
   */
  async deleteDomain(id: string): Promise<boolean> {
    const result = await this.db
      .delete(ssoDomains)
      .where(eq(ssoDomains.id, id))
      .returning({ id: ssoDomains.id });
    return result.length > 0;
  }

  // ============================================================
  // Enterprise Lookup
  // ============================================================

  /**
   * Check if an email belongs to an enterprise domain
   * Returns the connection and domain info if found
   */
  async lookupEnterpriseByEmail(
    email: string,
  ): Promise<EnterpriseLookupResult> {
    const emailLower = email.toLowerCase().trim();
    const atIndex = emailLower.indexOf("@");

    if (atIndex === -1) {
      return { isEnterprise: false };
    }

    const domain = emailLower.substring(atIndex + 1);

    // Try exact domain match first
    let ssoDomain = await this.findDomainByName(domain);

    // If no exact match, try parent domains (e.g., stern.nyu.edu -> nyu.edu)
    if (!ssoDomain) {
      const domainParts = domain.split(".");
      for (let i = 1; i < domainParts.length - 1; i++) {
        const parentDomain = domainParts.slice(i).join(".");
        ssoDomain = await this.findDomainByName(parentDomain);
        if (ssoDomain) break;
      }
    }

    if (!ssoDomain) {
      return { isEnterprise: false };
    }

    // Check email pattern if configured
    if (ssoDomain.emailPattern) {
      try {
        const pattern = new RegExp(ssoDomain.emailPattern, "i");
        if (!pattern.test(emailLower)) {
          return { isEnterprise: false };
        }
      } catch {
        // Invalid regex, skip pattern check
      }
    }

    // Get the associated connection
    const connection = await this.findConnectionById(ssoDomain.connectionId);
    if (!connection || !connection.enabled) {
      return { isEnterprise: false };
    }

    return {
      isEnterprise: true,
      connection,
      domain: ssoDomain,
    };
  }

  /**
   * Get SSO domains with their connection info (for admin UI)
   */
  async findDomainsWithConnections(): Promise<
    Array<SsoDomain & { connection: AuthConnection }>
  > {
    const domains = await this.db
      .select({
        domain: ssoDomains,
        connection: authConnections,
      })
      .from(ssoDomains)
      .innerJoin(
        authConnections,
        eq(ssoDomains.connectionId, authConnections.id),
      );

    return domains.map((d) => ({
      ...d.domain,
      connection: d.connection,
    }));
  }
}
