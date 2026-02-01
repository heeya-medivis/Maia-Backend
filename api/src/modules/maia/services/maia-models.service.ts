import { Injectable } from "@nestjs/common";
import { MaiaModelsRepository } from "../repositories/maia-models.repository";
import { MaiaHostsRepository } from "../repositories/maia-hosts.repository";
import { MaiaPromptsRepository } from "../repositories/maia-prompts.repository";
import { UserMaiaAccessRepository } from "../repositories/user-maia-access.repository";
import { MaiaModelResponseDto } from "../dto";
import {
  NotFoundException,
  BadRequestException,
} from "../../../common/exceptions";
import {
  MaiaModel,
  HostProvider as DbHostProvider,
} from "../../../database/schema";

@Injectable()
export class MaiaModelsService {
  constructor(
    private readonly modelsRepository: MaiaModelsRepository,
    private readonly hostsRepository: MaiaHostsRepository,
    private readonly promptsRepository: MaiaPromptsRepository,
    private readonly userAccessRepository: UserMaiaAccessRepository,
  ) {}

  async findAll(): Promise<MaiaModel[]> {
    return this.modelsRepository.findAll();
  }

  async findById(id: string): Promise<MaiaModel> {
    const model = await this.modelsRepository.findById(id);
    if (!model) {
      throw new NotFoundException("Model not found", "MODEL_NOT_FOUND");
    }
    return model;
  }

  async findByIdWithRelations(id: string) {
    const model = await this.modelsRepository.findByIdWithRelations(id);
    if (!model) {
      throw new NotFoundException("Model not found", "MODEL_NOT_FOUND");
    }
    return model;
  }

  /**
   * Get all models accessible by a user (for Unity app)
   * Matches C# MAIAAPIController.Models()
   */
  async getAccessibleModels(userId: string): Promise<MaiaModelResponseDto[]> {
    const models = await this.modelsRepository.findAccessibleByUser(userId);

    const responses: MaiaModelResponseDto[] = [];

    for (const model of models) {
      // Get prompts for this model
      const prompts = await this.promptsRepository.findByModelId(model.id);
      const systemPrompt = prompts.find(
        (p) => p.isActive && p.type === "system_prompt",
      );
      const analysisPrompt = prompts.find(
        (p) => p.isActive && p.type === "analysis_prompt",
      );

      // Get host for this model
      const host = await this.hostsRepository.findByModelId(model.id);

      responses.push({
        id: model.id,
        modelName: model.modelName,
        modelDisplayName: model.modelDisplayName,
        modelCategory: model.modelCategory,
        authenticationEndpoint: `${this.mapProviderToEndpoint(model.provider)}/Auth`,
        supportsDeepAnalysis: !!analysisPrompt,
        modelPriority: model.modelPriority ?? Number.MAX_SAFE_INTEGER,
        systemPrompt: systemPrompt?.content,
        analysisPrompt: analysisPrompt?.content,
        serverIp: host?.serverIp,
      });
    }

    return responses;
  }

  /**
   * Create a new model with optional host
   * Matches C# MAIAModelsController.Create()
   */
  async create(
    data: {
      modelName: string;
      modelDisplayName: string;
      modelPriority?: number;
      modelCategory: string;
      provider: string;
      pricing?: string;
      isActive?: boolean;
      hostProvider?: string;
      serverIp?: string;
    },
    createdById: string,
  ): Promise<MaiaModel> {
    // Only allow host info for self-hosted models
    let serverIp = data.serverIp?.trim() || null;
    let hostProvider = data.hostProvider;

    if (data.provider !== "self") {
      serverIp = null;
      hostProvider = undefined;
    } else if (serverIp && (!hostProvider || hostProvider === "invalid")) {
      throw new BadRequestException(
        "Please select a hosting provider when providing a Public IP address.",
        "HOST_PROVIDER_REQUIRED",
      );
    }

    const model = await this.modelsRepository.create({
      modelName: data.modelName,
      modelDisplayName: data.modelDisplayName,
      modelPriority: data.modelPriority,
      modelCategory: data.modelCategory as any,
      provider: data.provider as any,
      pricing: data.pricing ? parseFloat(data.pricing) : 0,
      isActive: data.isActive ?? true,
      createdById,
    });

    // Create host if server IP provided
    if (serverIp && hostProvider) {
      await this.hostsRepository.create({
        maiaModelId: model.id,
        serverIp,
        hostProvider: hostProvider as DbHostProvider,
        createdById,
      });
    }

    return model;
  }

  /**
   * Update a model and its host
   * Matches C# MAIAModelsController.Edit()
   */
  async update(
    id: string,
    data: {
      modelName: string;
      modelDisplayName: string;
      modelPriority?: number;
      modelCategory: string;
      provider: string;
      pricing?: string;
      isActive?: boolean;
      hostProvider?: string;
      serverIp?: string;
    },
    modifiedById: string,
  ): Promise<MaiaModel> {
    const existingModel = await this.modelsRepository.findById(id);
    if (!existingModel) {
      throw new NotFoundException("Model not found", "MODEL_NOT_FOUND");
    }

    // Only allow host info for self-hosted models
    let serverIp = data.serverIp?.trim() || null;
    const hostProvider = data.hostProvider;

    if (data.provider !== "self") {
      serverIp = null;
    } else if (serverIp && (!hostProvider || hostProvider === "invalid")) {
      throw new BadRequestException(
        "Please select a hosting provider when providing a Public IP address.",
        "HOST_PROVIDER_REQUIRED",
      );
    }

    const model = await this.modelsRepository.update(
      id,
      {
        modelName: data.modelName,
        modelDisplayName: data.modelDisplayName,
        modelPriority: data.modelPriority,
        modelCategory: data.modelCategory as any,
        provider: data.provider as any,
        pricing: data.pricing ? parseFloat(data.pricing) : 0,
        isActive: data.isActive,
      },
      modifiedById,
    );

    // Handle host updates (matching C# logic)
    const existingHost =
      await this.hostsRepository.findByModelIdIncludeDeleted(id);

    if (serverIp) {
      if (!existingHost) {
        await this.hostsRepository.create({
          maiaModelId: id,
          serverIp,
          hostProvider: hostProvider as DbHostProvider,
          createdById: modifiedById,
        });
      } else {
        if (
          existingHost.serverIp !== serverIp ||
          existingHost.hostProvider !== hostProvider
        ) {
          await this.hostsRepository.update(existingHost.id, {
            serverIp,
            hostProvider: hostProvider as DbHostProvider,
          });
        }
        if (existingHost.isDeleted) {
          await this.hostsRepository.restore(existingHost.id);
        }
      }
    } else if (existingHost && !existingHost.isDeleted) {
      await this.hostsRepository.softDelete(existingHost.id, modifiedById);
    }

    return model!;
  }

  /**
   * Set model status (activate/deactivate)
   * Matches C# MAIAAPIController.SetStatus()
   */
  async setStatus(
    modelName: string,
    data: {
      isActive: boolean;
      hostProvider: string;
      serverIp?: string;
    },
  ): Promise<{ message: string }> {
    const model = await this.modelsRepository.findByName(modelName);

    if (!model) {
      throw new BadRequestException("Model not found", "MODEL_NOT_FOUND");
    }

    if (model.provider !== "self") {
      throw new BadRequestException(
        "Not a self-hosted model. Confirm the model name or provider in the web server.",
        "NOT_SELF_HOSTED",
      );
    }

    const hostProvider = data.hostProvider?.toLowerCase() as DbHostProvider;
    if (!hostProvider || hostProvider === "invalid") {
      throw new BadRequestException(
        "Invalid host provider.",
        "INVALID_HOST_PROVIDER",
      );
    }

    await this.modelsRepository.update(model.id, { isActive: data.isActive });

    const existingHost = await this.hostsRepository.findByModelIdIncludeDeleted(
      model.id,
    );

    if (data.isActive) {
      if (!existingHost) {
        await this.hostsRepository.create({
          maiaModelId: model.id,
          hostProvider,
          serverIp: data.serverIp!,
        });
      } else {
        if (existingHost.serverIp !== data.serverIp) {
          await this.hostsRepository.update(existingHost.id, {
            serverIp: data.serverIp,
            hostProvider,
          });
        }
        if (existingHost.isDeleted) {
          await this.hostsRepository.restore(existingHost.id);
        }
      }
    } else if (existingHost) {
      await this.hostsRepository.softDelete(existingHost.id, "");
    }

    return {
      message: `Model '${modelName}' has been ${data.isActive ? "activated" : "deactivated"}.`,
    };
  }

  async softDelete(id: string, deletedById?: string): Promise<void> {
    const model = await this.modelsRepository.findById(id);
    if (!model) {
      throw new NotFoundException("Model not found", "MODEL_NOT_FOUND");
    }

    // Soft delete the model
    await this.modelsRepository.softDelete(id, deletedById ?? "");

    // Cascade: soft delete the host
    const host = await this.hostsRepository.findByModelId(id);
    if (host) {
      await this.hostsRepository.softDelete(host.id, deletedById ?? "");
    }

    // Cascade: soft delete all prompts for this model
    await this.promptsRepository.softDeleteByModelId(id, deletedById);

    // Cascade: deactivate all user access for this model
    await this.userAccessRepository.deactivateByModelId(id, deletedById);
  }

  private mapProviderToEndpoint(provider: string): string {
    switch (provider) {
      case "gcloud":
        return "GCloud";
      case "openai":
        return "OpenAI";
      case "self":
        return "SELF";
      default:
        return provider;
    }
  }
}
