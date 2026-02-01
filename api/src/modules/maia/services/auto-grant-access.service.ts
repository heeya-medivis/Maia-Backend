import { Injectable, Logger } from "@nestjs/common";
import { MaiaModelsRepository } from "../repositories/maia-models.repository";
import { UserMaiaAccessRepository } from "../repositories/user-maia-access.repository";

/**
 * Service to automatically grant model access to new users.
 *
 * When a new user signs up, this service grants them access to all
 * active models with priority 1 (the default/standard tier models).
 *
 * Alternatively, if AUTO_GRANT_ONE_PER_CATEGORY is enabled, it grants
 * access to the highest priority model in each category (balanced, thinking, live).
 */
@Injectable()
export class AutoGrantAccessService {
  private readonly logger = new Logger(AutoGrantAccessService.name);

  /** The priority level for models that should be auto-granted to new users */
  private static readonly AUTO_GRANT_PRIORITY = 1;

  constructor(
    private readonly maiaModelsRepository: MaiaModelsRepository,
    private readonly userMaiaAccessRepository: UserMaiaAccessRepository,
  ) {}

  /**
   * Grant access to all priority-1 models for a new user.
   * This is called when a user is first created.
   *
   * @param userId - The ID of the newly created user
   * @param createdById - The ID of the user/system that triggered the creation (optional, defaults to userId for self-signup)
   */
  async grantDefaultAccessForNewUser(
    userId: string,
    createdById?: string,
  ): Promise<void> {
    this.logger.log(`Auto-grant started for user ${userId}`);

    try {
      // Try priority-1 models first
      let defaultModels = await this.maiaModelsRepository.findActiveByPriority(
        AutoGrantAccessService.AUTO_GRANT_PRIORITY,
      );

      // If no priority-1 models, fall back to one model per category
      if (defaultModels.length === 0) {
        this.logger.log(
          "No priority-1 models found, falling back to one model per category",
        );
        defaultModels =
          await this.maiaModelsRepository.findOneActivePerCategory();
      }

      this.logger.log(`Found ${defaultModels.length} models for auto-grant`);

      if (defaultModels.length === 0) {
        this.logger.warn(
          "No models found for auto-grant. Make sure models have modelPriority=1 set or are active.",
        );
        return;
      }

      const grantedModels: string[] = [];

      for (const model of defaultModels) {
        try {
          await this.userMaiaAccessRepository.grantAccess(
            userId,
            model.id,
            createdById ?? userId,
          );
          grantedModels.push(model.modelDisplayName);
        } catch (error) {
          this.logger.error(
            `Failed to grant access to model ${model.modelName} for user ${userId}: ${error.message}`,
          );
        }
      }

      if (grantedModels.length > 0) {
        this.logger.log(
          `Auto-granted access to ${grantedModels.length} models for user ${userId}: ${grantedModels.join(", ")}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to auto-grant model access for user ${userId}: ${error.message}`,
      );
    }
  }
}
