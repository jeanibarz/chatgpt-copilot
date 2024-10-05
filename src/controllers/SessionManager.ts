// src/controllers/SessionManager.ts

/**
 * This module manages user sessions for the ChatGPT application. 
 * It handles the session state and interacts with the ConversationManager 
 * to perform session-related tasks.
 */

import { inject, injectable } from 'inversify';
import { ConversationManager } from '../ConversationManager';
import TYPES from '../inversify.types';
import { CoreLogger } from '../logging/CoreLogger';

/**
 * The SessionManager class is responsible for managing user sessions,
 * including clearing session data and interacting with other services
 * like ConversationManager to handle session-related operations.
 * 
 * Key Features:
 * - Clears ongoing sessions and resets the conversation state.
 * - Send requests for stopping processes.
 */
@injectable()
export class SessionManager {
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.ConversationManager) private conversationManager: ConversationManager,
    ) { }

    /**
     * Clears the current session by resetting relevant states.
     * This stops the ongoing generation and resets the conversation state.
     * 
     * This method is typically called when the user wants to start a new session 
     * or when the current session needs to be aborted for any reason.
     * 
     * @returns A promise that resolves to void.
     */
    public async clearSession(): Promise<void> {

    }


}