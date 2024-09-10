/**
 * This module manages the chat history for the ChatGPT VS Code extension.
 * It provides methods to add messages from users and assistants, clear the history,
 * and retrieve the current chat history or the last message.
 * 
 * The `ChatHistoryManager` class encapsulates the functionality for managing chat 
 * interactions, allowing for a structured approach to storing and retrieving messages.
 * 
 * Key Features:
 * - Stores chat messages in an internal array, maintaining the order of interactions.
 * - Allows adding messages with specified roles (either 'user' or 'assistant').
 * - Provides functionality to clear the entire chat history.
 * - Enables retrieval of the entire chat history or just the last message.
 * 
 * Usage:
 * - The `addMessage` method allows adding new messages to the chat history.
 * - The `clearHistory` method removes all messages from the history.
 * - The `getHistory` method retrieves the complete chat history as an array of messages.
 * - The `getLastMessage` method returns the most recent message in the history.
 */

import { CoreMessage } from "ai";

/**
 * The `ChatHistoryManager` class manages the chat history of user interactions
 * with the assistant. It allows for adding messages, clearing history, and
 * retrieving past messages.
 */
export class ChatHistoryManager {
    private chatHistory: CoreMessage[] = []; // Array to store chat messages

    /**
     * Adds a message to the chat history.
     * 
     * @param role - The role of the message sender ('user' or 'assistant').
     * @param content - The content of the message.
     */
    public addMessage(role: 'user' | 'assistant', content: string): void {
        this.chatHistory.push({ role, content });
    }

    /**
     * Clears the entire chat history.
     */
    public clearHistory(): void {
        this.chatHistory = [];
    }

    /**
     * Retrieves the current chat history.
     * 
     * @returns An array of `CoreMessage` objects representing the chat history.
     */
    public getHistory(): CoreMessage[] {
        return this.chatHistory;
    }

    /**
     * Retrieves the last message in the chat history.
     * 
     * @returns The last `CoreMessage` object or undefined if the history is empty.
     */
    public getLastMessage(): CoreMessage | undefined {
        return this.chatHistory[this.chatHistory.length - 1];
    }
}