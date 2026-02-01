import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { User, NewUser } from "../../database/schema";
import { NotFoundException } from "../../common/exceptions";
import { AutoGrantAccessService } from "../maia/services/auto-grant-access.service";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(forwardRef(() => AutoGrantAccessService))
    private readonly autoGrantAccessService: AutoGrantAccessService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(data: NewUser): Promise<User> {
    const user = await this.usersRepository.create(data);

    // Auto-grant access to priority-1 models for new users
    await this.autoGrantAccessService.grantDefaultAccessForNewUser(user.id);

    return user;
  }

  /**
   * Upsert user from WorkOS webhook/auth
   * Uses email as the primary identifier since WorkOS user IDs are different
   */
  async upsertFromWorkOS(data: {
    workosUserId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User> {
    // Find existing user by email
    const existingUser = await this.usersRepository.findByEmail(data.email);

    if (existingUser) {
      // Update existing user
      const updated = await this.usersRepository.update(existingUser.id, {
        firstName: data.firstName ?? existingUser.firstName,
        lastName: data.lastName ?? existingUser.lastName,
        deletedAt: null, // Reactivate if soft-deleted
      });
      return updated!;
    }

    // Create new user with nanoid as ID (not WorkOS ID)
    const { nanoid } = await import("nanoid");
    const newUser = await this.usersRepository.create({
      id: nanoid(),
      email: data.email,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
    });

    // Auto-grant access to priority-1 models for new users
    await this.autoGrantAccessService.grantDefaultAccessForNewUser(newUser.id);

    return newUser;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    const user = await this.usersRepository.update(id, data);
    if (!user) {
      throw new NotFoundException("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  async softDelete(id: string): Promise<void> {
    await this.usersRepository.softDelete(id);
  }

  /**
   * Soft delete user by WorkOS user ID
   *
   * Note: WorkOS user IDs are not currently stored in our database.
   * User deletion via webhooks would need to be enhanced to store WorkOS user IDs
   * or include the email in the webhook payload (not currently supported by WorkOS).
   *
   * For now, this logs a warning. User deletion should be handled manually or
   * by implementing WorkOS user ID storage in a future update.
   */
  async softDeleteByWorkOSId(workosUserId: string): Promise<void> {
    this.logger.warn(
      `softDeleteByWorkOSId called for WorkOS user ${workosUserId}, but WorkOS user IDs are not stored. ` +
        `Manual user deletion may be required.`,
    );
    // Future enhancement: Store WorkOS user ID in users table or identities table
    // and implement lookup here
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
