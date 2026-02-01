import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersRepository } from "./users.repository";

/**
 * Seeds an admin user on application startup if configured.
 *
 * Set ADMIN_SEED_EMAIL in environment variables to enable.
 * The user will be created with isAdmin=true if they don't exist,
 * or updated to isAdmin=true if they already exist.
 */
@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    const adminEmail = this.configService.get<string>("ADMIN_SEED_EMAIL");

    if (!adminEmail) {
      this.logger.debug("ADMIN_SEED_EMAIL not configured, skipping admin seed");
      return;
    }

    try {
      const existingUser = await this.usersRepository.findByEmail(adminEmail);

      if (existingUser) {
        if (existingUser.isAdmin) {
          this.logger.log(`Admin user already exists: ${adminEmail}`);
        } else {
          // Promote existing user to admin
          await this.usersRepository.update(existingUser.id, { isAdmin: true });
          this.logger.log(`Promoted existing user to admin: ${adminEmail}`);
        }
      } else {
        // Create new admin user
        const { nanoid } = await import("nanoid");
        await this.usersRepository.create({
          id: nanoid(),
          email: adminEmail,
          firstName: "Admin",
          lastName: "User",
          isAdmin: true,
        });
        this.logger.log(`Created admin user: ${adminEmail}`);
      }
    } catch (error) {
      this.logger.error(`Failed to seed admin user: ${error.message}`);
    }
  }
}
