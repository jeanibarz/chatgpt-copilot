// src/controllers/SessionManager.ts

/**
 * This module manages user sessions for the ChatGPT application. 
 * It handles the session state and interacts with the ChatGptViewProvider 
 * to perform session-related tasks.
 */

import { injectable } from 'inversify';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

@injectable()
export class SessionManager {
    private provider?: ChatGptViewProvider; // The ChatGptViewProvider instance for managing session state

    /**
     * Sets the provider after initialization to avoid circular dependencies.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing session-related tasks.
     * @returns void
     */
    public setProvider(provider: ChatGptViewProvider): void {
        this.provider = provider;
    }

    /**
     * Clears the current session by resetting relevant states.
     * This stops the ongoing generation and resets the API models.
     * 
     * This method is typically called when the user wants to start a new session 
     * or when the current session needs to be aborted for any reason.
     * 
     * @returns void
     * @throws Error if the provider is not set in SessionManager.
     */
    public clearSession(): void {
        if (!this.provider) {
            throw new Error("Provider not set in SessionManager");
        }

        // Abort ongoing generation if any
        this.provider.commandHandler.executeCommand(ChatGPTCommandType.StopGenerating, {});

        // Reset API models and conversation state
        this.provider.apiChat = undefined;
        this.provider.apiCompletion = undefined;
        this.provider.conversationId = undefined;

        this.provider.logger.info("Session cleared");
    }
}