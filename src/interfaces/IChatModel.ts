/**
 * This module defines the interface for chat models used within the VS Code extension.
 * The `IChatModel` interface specifies the contract that any chat model implementation 
 * must adhere to, ensuring that models can send messages and handle responses 
 * in a consistent manner.
 */

/**
 * The IChatModel interface outlines the methods that a chat model must implement
 * to facilitate message sending and response handling.
 * 
 * Key Features:
 * - Provides a method to send messages with additional context.
 * - Allows for real-time response updates through a callback function.
 */
export interface IChatModel {
    /**
     * Sends a message to the chat model with additional context and updates the response.
     * 
     * @param prompt - The message prompt to be sent to the chat model.
     * @param additionalContext - Any additional context information to enhance the response.
     * @param updateResponse - A callback function that receives the model's response as it is generated.
     * @returns A promise that resolves when the message has been sent and processed.
     */
    sendMessage(prompt: string, additionalContext: string, updateResponse: (message: string) => void): Promise<void>;
}