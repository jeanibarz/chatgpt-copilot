// File: src/sessionManager.ts

import { ChatGptViewProvider, CommandType } from './chatgptViewProvider';

/**
 * The `SessionManager` class handles session-related tasks for the ChatGPT view provider.
 * This includes clearing the session state, aborting requests, and resetting API models.
 */
export class SessionManager {
    private provider: ChatGptViewProvider;

    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Clears the current session by resetting relevant states.
     * This stops the ongoing generation and resets the API models.
     */
    public clearSession(): void {
        // Abort ongoing generation if any
        this.provider.commandHandler.executeCommand(CommandType.StopGenerating, {});

        // Reset API models and conversation state
        this.provider.apiChat = undefined;
        this.provider.apiCompletion = undefined;
        this.provider.conversationId = undefined;

        this.provider.logger.info("Session cleared");
    }
}
