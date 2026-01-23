import { Injectable } from '@nestjs/common';
import { MaiaPromptsRepository } from '../repositories/maia-prompts.repository';
import { MaiaPromptDto } from '../dto';
import { NotFoundException, BadRequestException } from '../../../common/exceptions';
import { MaiaPrompt, PromptType } from '../../../database/schema';

@Injectable()
export class MaiaPromptsService {
  constructor(private readonly promptsRepository: MaiaPromptsRepository) {}

  async findById(id: string): Promise<MaiaPrompt> {
    const prompt = await this.promptsRepository.findById(id);
    if (!prompt) {
      throw new NotFoundException('Prompt not found', 'PROMPT_NOT_FOUND');
    }
    return prompt;
  }

  async findByModelId(maiaModelId: string): Promise<MaiaPrompt[]> {
    return this.promptsRepository.findByModelId(maiaModelId);
  }

  /**
   * Create a new prompt
   * Matches C# MAIAModelsController.CreatePrompt()
   * Only one active prompt per type per model
   */
  async create(
    maiaModelId: string,
    data: MaiaPromptDto,
    createdById: string,
  ): Promise<MaiaPrompt> {
    const promptType = this.mapPromptType(data.type);

    // If this prompt will be active, deactivate other prompts of same type
    if (data.isActive) {
      await this.promptsRepository.deactivateByModelIdAndType(
        maiaModelId,
        promptType,
        createdById,
      );
    }

    return this.promptsRepository.create({
      type: promptType,
      content: data.content,
      maiaModelId,
      isActive: data.isActive,
      createdById,
    });
  }

  /**
   * Update a prompt
   * Matches C# MAIAModelsController.UpdatePrompt()
   */
  async update(
    promptId: string,
    data: MaiaPromptDto,
    modifiedById: string,
  ): Promise<MaiaPrompt> {
    const prompt = await this.promptsRepository.findById(promptId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found', 'PROMPT_NOT_FOUND');
    }

    const promptType = this.mapPromptType(data.type);

    // If activating, deactivate other prompts of same type (excluding this one)
    if (data.isActive) {
      // Deactivate all OTHER active prompts of the same type
      const activePrompt = await this.promptsRepository.findActiveByModelIdAndType(
        prompt.maiaModelId,
        promptType,
      );
      if (activePrompt && activePrompt.id !== promptId) {
        await this.promptsRepository.update(
          activePrompt.id,
          { isActive: false },
          modifiedById,
        );
      }
    }

    const updated = await this.promptsRepository.update(
      promptId,
      {
        type: promptType,
        content: data.content,
        isActive: data.isActive,
      },
      modifiedById,
    );

    return updated!;
  }

  /**
   * Delete a prompt
   * Matches C# MAIAModelsController.DeletePrompt()
   */
  async softDelete(promptId: string, deletedById: string): Promise<void> {
    const prompt = await this.promptsRepository.findById(promptId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found', 'PROMPT_NOT_FOUND');
    }

    await this.promptsRepository.softDelete(promptId, deletedById);
  }

  private mapPromptType(type: number): PromptType {
    switch (type) {
      case 1:
        return 'system_prompt';
      case 2:
        return 'analysis_prompt';
      default:
        return 'invalid';
    }
  }
}
