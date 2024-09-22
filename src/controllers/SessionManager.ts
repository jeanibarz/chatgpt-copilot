/**
 * src/controllers/SessionManager.ts
 * 
 * This module manages session-related tasks for the ChatGPT view provider 
 * within a VS Code extension. It includes functionalities to clear the session 
 * state, abort ongoing requests, and reset API models to ensure a fresh 
 * environment for new interactions.
 * 
 * The `SessionManager` class is responsible for handling session management 
 * tasks, providing methods to reset the session state and manage ongoing 
 * command executions.
 * 
 * Key Features:
 * - Clears the current session state and resets API models.
 * - Aborts ongoing generation requests when clearing the session.
 */

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class SessionManager {
    private provider: ChatGptViewProvider; // The ChatGptViewProvider instance for managing session state

    /**
     * Constructor for the `SessionManager` class.
     * Initializes a new instance of the SessionManager with the provided view provider.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing session-related tasks.
     */
    constructor(provider: ChatGptViewProvider) {
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
     */
    public clearSession(): void {
        // Abort ongoing generation if any
        this.provider.commandHandler.executeCommand(ChatGPTCommandType.StopGenerating, {});

        // Reset API models and conversation state
        this.provider.apiChat = undefined;
        this.provider.apiCompletion = undefined;
        this.provider.conversationId = undefined;

        this.provider.logger.info("Session cleared");
    }
}