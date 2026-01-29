import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, NewUser } from '../../database/schema';
import { NotFoundException } from '../../common/exceptions';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(data: NewUser): Promise<User> {
    return this.usersRepository.create(data);
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
    emailVerified?: boolean;
  }): Promise<User> {
    // Find existing user by email
    const existingUser = await this.usersRepository.findByEmail(data.email);

    if (existingUser) {
      // Update existing user
      const updated = await this.usersRepository.update(existingUser.id, {
        firstName: data.firstName ?? existingUser.firstName,
        lastName: data.lastName ?? existingUser.lastName,
        emailConfirmed: data.emailVerified ?? existingUser.emailConfirmed,
        deletedAt: null, // Reactivate if soft-deleted
      });
      return updated!;
    }

    // Create new user with nanoid as ID (not WorkOS ID)
    const { nanoid } = await import('nanoid');
    return this.usersRepository.create({
      id: nanoid(),
      email: data.email,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      emailConfirmed: data.emailVerified ?? false,
    });
  }

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    const user = await this.usersRepository.update(id, data);
    if (!user) {
      throw new NotFoundException('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  async softDelete(id: string): Promise<void> {
    await this.usersRepository.softDelete(id);
  }

  /**
   * Soft delete user by WorkOS user ID
   * Looks up user by WorkOS ID in identities table
   * 
   * TODO: Implement lookup by workosUserId in identities table and soft delete the user
   */
  async softDeleteByWorkOSId(_workosUserId: string): Promise<void> {
    // Not yet implemented - requires identity table lookup
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
