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

    /**
     * Prepares the conversation context, initializing the AI model if necessary.
     * 
     * @param modelChanged - A boolean indicating if the AI model has changed.
     * @param conversationId - An optional conversation ID to use for the session.
     * @returns A promise that resolves to true if the conversation was prepared successfully, otherwise false.
     */
    public async prepareConversation(modelChanged = false, conversationId?: string): Promise<boolean> {
        this.logger.info("Initiating conversation preparation", { modelChanged, providedConversationId: !!conversationId });

        try {
            if (conversationId) {
                this.conversationId = conversationId;
                this.logger.info("Adopting provided conversation ID for session", { conversationId: this.conversationId });
            } else if (!this.conversationId) {
                this.conversationId = Utility.getRandomId();
                this.logger.info("Generated new unique conversation identifier", { conversationId: this.conversationId });
            } else {
                this.logger.info("Continuing with existing conversation ID", { conversationId: this.conversationId });
            }

            this.logger.info("Conversation context successfully established");
            return true;
        } catch (error) {
            this.logger.error("Encountered error during conversation preparation", { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }

    /**
     * Clears the current conversation context and ID.
     */
    public clearConversation(): void {
        const previousId = this.conversationId;
        this.conversationId = undefined;
        this.logger.info("Conversation context reset", { previousConversationId: previousId });
    }

    /**
     * Retrieves the current conversation ID.
     * 
     * @returns The current conversation ID, or undefined if no ID is set.
     */
    public getConversationId(): string | undefined {
        return this.conversationId;
    }
}