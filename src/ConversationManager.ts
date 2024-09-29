// src/ConversationManager.ts

/**
 * This module manages the conversation context for the ChatGPT view provider 
 * within a VS Code extension. The `ConversationManager` class is responsible 
 * for preparing and managing conversations, ensuring that the appropriate AI 
 * model is initialized based on the current configurations.
 * 
 * Key Features:
 * - Prepares the conversation context and initializes the AI model.
 * - Handles conversation ID generation and management.
 * - Provides logging for conversation preparation and errors.
 */

import { injectable } from 'inversify';
import { Utility } from './Utility';
import { ChatGptViewProvider } from './view/ChatGptViewProvider';

@injectable()
export class ConversationManager {
    private provider?: ChatGptViewProvider; // The ChatGptViewProvider instance for managing conversations

    /**
     * Sets the provider after initialization to avoid circular dependencies.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing session-related tasks.
     */
    public setProvider(provider: ChatGptViewProvider): void {
        this.provider = provider;
    }

    /**
     * Prepares the conversation context and initializes the appropriate AI model
     * based on the current configurations.
     * 
     * This method generates a new conversation ID if one doesn't exist and 
     * prepares the model for the conversation using the model manager.
     * 
     * @param modelChanged - A flag indicating whether the model has changed.
     * @returns A Promise which resolves to a boolean indicating success or failure.
     */
    public async prepareConversation(modelChanged = false): Promise<boolean> {
        if (!this.provider) {
            throw new Error("Provider not set in ConversationManager");
        }

        this.provider.logger.info("Preparing conversation", { modelChanged });

        try {
            // Generate a new conversation ID if one doesn't exist
            this.provider.conversationId = this.provider.conversationId || Utility.getRandomId();

            // Prepare the model for the conversation using the model manager
            if (await this.provider.modelManager.prepareModelForConversation(modelChanged, this.provider.logger, this.provider)) {
                this.provider.sendMessage({ type: "loginSuccessful" });
                this.provider.logger.info("Conversation prepared successfully");
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.provider.logger.error("Failed to prepare conversation", { error });
            return false; // Return false to indicate failure
        }
    }
}