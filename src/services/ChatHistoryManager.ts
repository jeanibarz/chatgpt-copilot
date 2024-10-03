// src/services/ChatHistoryManager.ts

/**
 * This module manages the chat history of user interactions with the assistant.
 * It provides functionalities to add messages, clear history, and retrieve past messages.
 */

import { CoreMessage } from "ai";
import { CoreLogger } from "../logging/CoreLogger";
import { injectable } from "inversify";

const logger = CoreLogger.getInstance();

export enum MessageRole {
    User = 'user',
    Assistant = 'assistant',
    System = 'system',
}

/**
 * The `ChatHistoryManager` class manages the chat history of user interactions
 * with the assistant. It allows for adding messages, clearing history, and
 * retrieving past messages.
 * 
 * Key Features:
 * - Stores chat messages in an internal array, maintaining the order of interactions.
 * - Allows adding messages with specified roles (either 'user' or 'assistant').
 * - Provides functionality to clear the entire chat history.
 * - Enables retrieval of the entire chat history or just the last message.
 */
@injectable()
export class ChatHistoryManager {
    private history: CoreMessage[] = []; // Array to store chat messages

    /**
     * Adds a message to the chat history.
     * 
     * @param role - The role of the message sender ('user' or 'assistant').
     * @param content - The content of the message.
     */
    public addMessage(role: MessageRole, content: string): void {
        const message: CoreMessage = { role, content }; // Create a structured message
        this.history.push(message);
        logger.info(`Message added to history: ${JSON.stringify(message)}`);
    }

    /**
     * Clears the chat history.
     */
    public clearHistory(): void {
        this.history.length = 0;
        logger.info("Chat history cleared.");
    }

    /**
     * Retrieves the current chat history.
     * 
     * @returns An array of messages in the chat history.
     */
    public getHistory(): CoreMessage[] {
        return [...this.history]; // Return a copy of the history array
    }

    /**
     * Retrieves the last message in the chat history.
     * 
     * @returns The last message or null if the history is empty.
     */
    public getLastMessage(): CoreMessage | null {
        return this.history.at(-1) || null;
    }

    /**
     * Returns a formatted string representation of the chat history.
     * 
     * @returns A string containing the formatted chat history.
     */
    public getFormattedHistory(): string {
        return this.history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }
}