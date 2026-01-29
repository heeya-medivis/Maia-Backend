import { Injectable } from '@nestjs/common';
import { UserMaiaAccessRepository, UserMaiaAccessRecord } from '../repositories/user-maia-access.repository';
import { NotFoundException } from '../../../common/exceptions';

@Injectable()
export class UserMaiaAccessService {
  constructor(private readonly accessRepository: UserMaiaAccessRepository) {}

  async findByModelId(maiaModelId: string): Promise<UserMaiaAccessRecord[]> {
    return this.accessRepository.findByModelId(maiaModelId);
  }

  async findActiveByUserId(userId: string): Promise<UserMaiaAccessRecord[]> {
    return this.accessRepository.findActiveByUserId(userId);
  }

  /**
   * Get users without access to a model
   * Matches C# MAIAModelsController.GetAvailableUsers()
   */
  async getAvailableUsers(maiaModelId: string) {
    return this.accessRepository.findUsersWithoutModelAccess(maiaModelId);
  }

  /**
   * Get users with active access to a model
   */
  async getUsersWithAccess(maiaModelId: string) {
    return this.accessRepository.findUsersWithModelAccess(maiaModelId);
  }

  /**
   * Grant or revoke user access to a model
   * Matches C# MAIAModelsController.ManageUserAccess()
   */
  async manageAccess(
    maiaModelId: string,
    userId: string,
    grantAccess: boolean,
    adminUserId: string,
  ): Promise<{ message: string }> {
    const existing = await this.accessRepository.findByUserAndModel(
      userId,
      maiaModelId,
    );

    if (grantAccess) {
      if (existing?.isActive) {
        return { message: 'User already has access to this model.' };
      }

      await this.accessRepository.grantAccess(userId, maiaModelId, adminUserId);
      return { message: 'Access granted.' };
    } else {
      if (!existing) {
        throw new NotFoundException('User access not found', 'ACCESS_NOT_FOUND');
      }

      await this.accessRepository.revokeAccess(userId, maiaModelId, adminUserId);
      return { message: 'Access revoked.' };
    }
  }
}
