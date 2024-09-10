// File: src/conversationManager.ts

import { ChatGptViewProvider } from './chatgptViewProvider';
import { Utility } from './utility';

/**
 * The `ConversationManager` class handles the preparation and management
 * of conversations for the ChatGPT view provider.
 */
export class ConversationManager {
    private provider: ChatGptViewProvider;

    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Prepares the conversation context and initializes the appropriate AI model
     * based on the current configurations.
     * 
     * @param modelChanged - A flag indicating whether the model has changed.
     * @returns A Promise which resolves to a boolean indicating success or failure.
     */
    public async prepareConversation(modelChanged = false): Promise<boolean> {
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
