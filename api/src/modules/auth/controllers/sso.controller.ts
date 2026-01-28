import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { SsoRepository, EnterpriseLookupResult } from '../repositories/sso.repository';
import { WorkOSService } from '../services/workos.service';
import type { AuthProtocol } from '../../../database/schema/auth-connections';

// ============================================================
// DTOs
// ============================================================

interface LookupEnterpriseDto {
  email: string;
}

interface LookupEnterpriseResponseDto {
  isEnterprise: boolean;
  connectionId?: string;
  organizationName?: string;
  workosConnectionId?: string;
}

interface CreateConnectionDto {
  name: string;
  protocol: AuthProtocol;
  workosConnectionId?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

interface UpdateConnectionDto {
  name?: string;
  workosConnectionId?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

interface CreateDomainDto {
  domain: string;
  connectionId: string;
  organizationName?: string;
  enabled?: boolean;
  autoVerifyEmail?: boolean;
  emailPattern?: string;
}

interface UpdateDomainDto {
  domain?: string;
  connectionId?: string;
  organizationName?: string;
  enabled?: boolean;
  autoVerifyEmail?: boolean;
  emailPattern?: string;
}

/**
 * SSO Controller
 * 
 * Public endpoints:
 * - POST /v1/sso/lookup - Check if email belongs to enterprise domain
 * 
 * Admin endpoints:
 * - GET /v1/sso/connections - List all SSO connections
 * - POST /v1/sso/connections - Create SSO connection
 * - PUT /v1/sso/connections/:id - Update SSO connection
 * - DELETE /v1/sso/connections/:id - Delete SSO connection
 * - GET /v1/sso/domains - List all SSO domains
 * - POST /v1/sso/domains - Create SSO domain mapping
 * - PUT /v1/sso/domains/:id - Update SSO domain
 * - DELETE /v1/sso/domains/:id - Delete SSO domain
 */
@Controller('v1/sso')
export class SsoController {
  private readonly logger = new Logger(SsoController.name);

  constructor(
    private readonly ssoRepository: SsoRepository,
    private readonly workosService: WorkOSService,
  ) {}

  // ============================================================
  // Public Endpoints
  // ============================================================

  /**
   * POST /v1/sso/lookup
   * Check if an email belongs to an enterprise SSO domain
   * 
   * This is called before login to determine if the user should be
   * redirected to their organization's SSO provider (e.g., NYU, MIT)
   */
  @Post('lookup')
  async lookupEnterprise(
    @Body() dto: LookupEnterpriseDto,
  ): Promise<LookupEnterpriseResponseDto> {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    const result = await this.ssoRepository.lookupEnterpriseByEmail(dto.email);

    if (!result.isEnterprise) {
      return { isEnterprise: false };
    }

    return {
      isEnterprise: true,
      connectionId: result.connection?.id,
      organizationName: result.domain?.organizationName ?? result.connection?.name,
      workosConnectionId: result.connection?.workosConnectionId ?? undefined,
    };
  }

  /**
   * GET /v1/sso/lookup
   * Same as POST but via query param (for convenience)
   */
  @Get('lookup')
  async lookupEnterpriseGet(
    @Query('email') email: string,
  ): Promise<LookupEnterpriseResponseDto> {
    return this.lookupEnterprise({ email });
  }

  // ============================================================
  // Admin Endpoints - Connections
  // ============================================================

  /**
   * GET /v1/sso/connections
   * List all SSO connections (admin only)
   */
  @Get('connections')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listConnections() {
    const connections = await this.ssoRepository.findAllConnections();
    return { connections };
  }

  /**
   * GET /v1/sso/connections/:id
   * Get a single SSO connection (admin only)
   */
  @Get('connections/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getConnection(@Param('id') id: string) {
    const connection = await this.ssoRepository.findConnectionById(id);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    
    // Get associated domains
    const domains = await this.ssoRepository.findDomainsByConnectionId(id);
    
    return { connection, domains };
  }

  /**
   * POST /v1/sso/connections
   * Create a new SSO connection (admin only)
   */
  @Post('connections')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createConnection(@Body() dto: CreateConnectionDto) {
    if (!dto.name || !dto.protocol) {
      throw new BadRequestException('Name and protocol are required');
    }

    // Validate WorkOS connection if provided
    if (dto.workosConnectionId) {
      try {
        await this.workosService.getConnection(dto.workosConnectionId);
      } catch {
        throw new BadRequestException('Invalid WorkOS connection ID');
      }
    }

    const connection = await this.ssoRepository.createConnection({
      name: dto.name,
      protocol: dto.protocol,
      workosConnectionId: dto.workosConnectionId,
      enabled: dto.enabled ?? true,
      isDefault: dto.isDefault ?? false,
    });

    this.logger.log(`Created SSO connection: ${connection.id} (${connection.name})`);
    return { connection };
  }

  /**
   * PUT /v1/sso/connections/:id
   * Update an SSO connection (admin only)
   */
  @Put('connections/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    const existing = await this.ssoRepository.findConnectionById(id);
    if (!existing) {
      throw new NotFoundException('Connection not found');
    }

    // Validate WorkOS connection if being updated
    if (dto.workosConnectionId && dto.workosConnectionId !== existing.workosConnectionId) {
      try {
        await this.workosService.getConnection(dto.workosConnectionId);
      } catch {
        throw new BadRequestException('Invalid WorkOS connection ID');
      }
    }

    const connection = await this.ssoRepository.updateConnection(id, dto);
    this.logger.log(`Updated SSO connection: ${id}`);
    return { connection };
  }

  /**
   * DELETE /v1/sso/connections/:id
   * Delete an SSO connection (admin only)
   * Note: This will also delete all associated domain mappings
   */
  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteConnection(@Param('id') id: string) {
    const existing = await this.ssoRepository.findConnectionById(id);
    if (!existing) {
      throw new NotFoundException('Connection not found');
    }

    await this.ssoRepository.deleteConnection(id);
    this.logger.log(`Deleted SSO connection: ${id}`);
    return { success: true };
  }

  // ============================================================
  // Admin Endpoints - Domains
  // ============================================================

  /**
   * GET /v1/sso/domains
   * List all SSO domain mappings (admin only)
   */
  @Get('domains')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listDomains() {
    const domains = await this.ssoRepository.findDomainsWithConnections();
    return { domains };
  }

  /**
   * GET /v1/sso/domains/:id
   * Get a single SSO domain (admin only)
   */
  @Get('domains/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getDomain(@Param('id') id: string) {
    const domain = await this.ssoRepository.findDomainById(id);
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return { domain };
  }

  /**
   * POST /v1/sso/domains
   * Create a new SSO domain mapping (admin only)
   */
  @Post('domains')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createDomain(@Body() dto: CreateDomainDto) {
    if (!dto.domain || !dto.connectionId) {
      throw new BadRequestException('Domain and connectionId are required');
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(dto.domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Check connection exists
    const connection = await this.ssoRepository.findConnectionById(dto.connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Check domain doesn't already exist
    const existingDomain = await this.ssoRepository.findDomainByName(dto.domain);
    if (existingDomain) {
      throw new BadRequestException('Domain already exists');
    }

    // Validate email pattern if provided
    if (dto.emailPattern) {
      try {
        new RegExp(dto.emailPattern);
      } catch {
        throw new BadRequestException('Invalid email pattern regex');
      }
    }

    const domain = await this.ssoRepository.createDomain({
      domain: dto.domain,
      connectionId: dto.connectionId,
      organizationName: dto.organizationName,
      enabled: dto.enabled ?? true,
      autoVerifyEmail: dto.autoVerifyEmail ?? true,
      emailPattern: dto.emailPattern,
    });

    this.logger.log(`Created SSO domain mapping: ${domain.domain} -> ${connection.name}`);
    return { domain };
  }

  /**
   * PUT /v1/sso/domains/:id
   * Update an SSO domain mapping (admin only)
   */
  @Put('domains/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateDomain(
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    const existing = await this.ssoRepository.findDomainById(id);
    if (!existing) {
      throw new NotFoundException('Domain not found');
    }

    // Validate domain format if being updated
    if (dto.domain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(dto.domain)) {
        throw new BadRequestException('Invalid domain format');
      }

      // Check if new domain already exists (and is not this one)
      const existingDomain = await this.ssoRepository.findDomainByName(dto.domain);
      if (existingDomain && existingDomain.id !== id) {
        throw new BadRequestException('Domain already exists');
      }
    }

    // Check connection exists if being updated
    if (dto.connectionId) {
      const connection = await this.ssoRepository.findConnectionById(dto.connectionId);
      if (!connection) {
        throw new NotFoundException('Connection not found');
      }
    }

    // Validate email pattern if provided
    if (dto.emailPattern) {
      try {
        new RegExp(dto.emailPattern);
      } catch {
        throw new BadRequestException('Invalid email pattern regex');
      }
    }

    const domain = await this.ssoRepository.updateDomain(id, dto);
    this.logger.log(`Updated SSO domain: ${id}`);
    return { domain };
  }

  /**
   * DELETE /v1/sso/domains/:id
   * Delete an SSO domain mapping (admin only)
   */
  @Delete('domains/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteDomain(@Param('id') id: string) {
    const existing = await this.ssoRepository.findDomainById(id);
    if (!existing) {
      throw new NotFoundException('Domain not found');
    }

    await this.ssoRepository.deleteDomain(id);
    this.logger.log(`Deleted SSO domain: ${id}`);
    return { success: true };
  }

  // ============================================================
  // Admin Endpoints - WorkOS Sync
  // ============================================================

  /**
   * GET /v1/sso/workos/connections
   * List connections from WorkOS (admin only)
   * Useful for syncing or discovering available connections
   */
  @Get('workos/connections')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listWorkosConnections(@Query('organizationId') organizationId?: string) {
    if (organizationId) {
      const connections = await this.workosService.listConnections(organizationId);
      return { connections: connections.data };
    }
    // Without org ID, we can't list - return empty
    return { connections: [], message: 'Provide organizationId to list WorkOS connections' };
  }
}
