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

  async upsertFromClerk(data: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: boolean;
  }): Promise<User> {
    return this.usersRepository.upsert({
      id: data.id,
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

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
