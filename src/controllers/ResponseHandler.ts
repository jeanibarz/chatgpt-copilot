/**
 * src/controllers/ResponseHandler.ts
 * 
 * This module handles chat responses within the ChatGPT view provider 
 * for a VS Code extension. It processes messages sent to the chat model, 
 * updates the response, and finalizes it for display in the webview.
 * 
 * The `ResponseHandler` class is responsible for managing the entire 
 * lifecycle of a chat response, including sending the prompt to the model, 
 * updating the response in real-time, and handling any errors that may occur.
 * 
 * Key Features:
 * - Sends messages to the chat model and updates the response.
 * - Finalizes the response and updates chat history.
 * - Handles incomplete responses and prompts the user to continue.
 */

import * as vscode from 'vscode';
import { IChatModel } from '../interfaces/IChatModel';
import { MessageRole } from "../services/ChatHistoryManager";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class ResponseHandler {
    private provider: ChatGptViewProvider; // The ChatGptViewProvider instance for managing responses

    /**
     * Constructor for the `ResponseHandler` class.
     * Initializes a new instance of ResponseHandler with the provided view provider.
     * 
     * @param provider - An instance of `ChatGptViewProvider` for managing chat responses.
     */
    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Handles the chat response by sending the message to the model and updating the response.
     * 
     * @param model - The chat model to send the message to.
     * @param prompt - The prompt to send.
     * @param additionalContext - Additional context for the prompt.
     * @param options - Options related to the API call, including command and previous answer.
     * @returns A promise that resolves when the chat response has been handled.
     */
    public async handleChatResponse(
        model: IChatModel,
        prompt: string,
        additionalContext: string,
        options: { command: string; previousAnswer?: string; }
    ) {
        const responseInMarkdown = !this.provider.modelManager.isCodexModel;
        const updateResponse = (message: string) => {
            this.provider.response += message;
            this.sendResponseUpdate();
        };

        try {
            await model.sendMessage(prompt, additionalContext, updateResponse);
            this.provider.chatHistoryManager.addMessage(MessageRole.User, prompt);
            await this.finalizeResponse(options);
        } catch (error) {
            this.provider.handleApiError(error, prompt, options);
        }
    }

    /**
     * Finalizes the response after processing and updates the chat history.
     * 
     * @param options - Options related to the API call, including command and previous answer.
     * @returns A promise that resolves when the response has been finalized.
     */
    private async finalizeResponse(options: { command: string; previousAnswer?: string; }) {
        if (options.previousAnswer != null) {
            this.provider.response = options.previousAnswer + this.provider.response; // Combine with previous answer
        }

        this.provider.chatHistoryManager.addMessage(MessageRole.Assistant, this.provider.response); // Add assistant response

        if (this.isResponseIncomplete()) {
            await this.promptToContinue(options);
        }

        this.sendResponseUpdate(true); // Send final response indicating completion
    }

    /**
     * Sends a response update to the webview.
     * 
     * @param done - Indicates if the response is complete.
     */
    private sendResponseUpdate(done: boolean = false) {
        this.provider.sendMessage({
            type: "addResponse",
            value: this.provider.response,
            done,
            id: this.provider.currentMessageId,
            autoScroll: this.provider.configurationManager.autoScroll,
            responseInMarkdown: !this.provider.modelManager.isCodexModel,
        });
    }

    /**
     * Checks if the response is incomplete based on markdown formatting.
     * 
     * @returns True if the response is incomplete; otherwise, false.
     */
    private isResponseIncomplete(): boolean {
        return this.provider.response.split("```").length % 2 === 0;
    }

    /**
     * Prompts the user to continue if the response is incomplete.
     * 
     * @param options - Options related to the API call, including command.
     * @returns A promise that resolves when the user has made a choice.
     */
    private async promptToContinue(options: { command: string; }) {
        const choice = await vscode.window.showInformationMessage(
            "It looks like the response was incomplete. Would you like to continue?",
            "Continue",
            "Cancel"
        );

        if (choice === "Continue") {
            await this.provider.sendApiRequest("Continue", {
                command: options.command,
                code: undefined,
                previousAnswer: this.provider.response,
            });
        }
    }
}