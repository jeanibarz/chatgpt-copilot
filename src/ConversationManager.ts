// src/ConversationManager.ts

/**
 * This module manages the conversation context within a VS Code extension.
 * The `ConversationManager` class is responsible for preparing and managing
 * conversations, ensuring that the appropriate AI model is initialized based
 * on the current configurations.
 * 
 * Key Features:
 * - Prepares the conversation context and initializes the AI model.
 * - Handles conversation ID generation and management.
 * - Provides logging for conversation preparation and errors.
 */

import { injectable } from 'inversify';
import { CoreLogger } from './logging/CoreLogger';
import { Utility } from './Utility';

@injectable()
export class ConversationManager {
    private logger: CoreLogger = CoreLogger.getInstance();
    private conversationId?: string;

    public async prepareConversation(modelChanged = false, conversationId?: string): Promise<boolean> {
        this.logger.info("Preparing conversation", { modelChanged });

        try {
            if (conversationId) {
                this.conversationId = conversationId;
                this.logger.info("Using provided conversation ID", { conversationId: this.conversationId });
            } else if (!this.conversationId) {
                this.conversationId = Utility.getRandomId();
                this.logger.info("Generated new conversation ID", { conversationId: this.conversationId });
            }

            this.logger.info("Conversation prepared successfully");
            return true;
        } catch (error) {
            this.logger.error("Failed to prepare conversation", { error });
            return false;
        }
    }

    public clearConversation(): void {
        this.conversationId = undefined;
        this.logger.info("Conversation cleared");
    }

    public getConversationId(): string | undefined {
        return this.conversationId;
    }
}
