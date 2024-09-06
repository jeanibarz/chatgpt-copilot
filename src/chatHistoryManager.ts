// File: src/chatHistoryManager.ts

/**
 * This module manages the chat history for the ChatGPT VS Code extension.
 * It provides methods to add messages from users and assistants, clear the history,
 * and retrieve the current chat history or the last message.
 * 
 * Key Features:
 * - Stores chat messages in an internal array.
 * - Allows adding messages with specified roles.
 * - Provides functionality to clear and retrieve chat history.
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
    public addMessage(role: 'user' | 'assistant', content: string) {
        this.chatHistory.push({ role, content });
    }

    /**
     * Clears the entire chat history.
     */
    public clearHistory() {
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
