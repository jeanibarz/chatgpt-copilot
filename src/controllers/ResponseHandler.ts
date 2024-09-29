// src/controllers/ResponseHandler.ts

/**
 * This module handles responses for chat interactions, integrating with the 
 * MediatorService to manage updates and interactions with the chat model.
 */

import { inject, injectable } from "inversify";
import * as vscode from 'vscode';
import { IChatModel } from '../interfaces/IChatModel';
import TYPES from "../inversify.types";
import { AddChatHistoryMessageRequest } from "../requests/AddChatHistoryMessageRequest";
import { HandleApiErrorRequest } from "../requests/HandleApiErrorRequest";
import { SendApiRequest } from "../requests/SendApiRequest";
import { SendMessageRequest } from "../requests/SendMessageRequest";
import { MessageRole } from "../services/ChatHistoryManager";
import { MediatorService } from "../services/MediatorService";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

@injectable()
export class ResponseHandler {
    private provider?: ChatGptViewProvider;
    private mediatorService: MediatorService;

    /**
     * Constructor for the `ResponseHandler` class.
     * Initializes a new instance of ResponseHandler with the mediator service.
     * 
     * @param mediatorService - An instance of MediatorService for handling mediator requests.
     */
    constructor(
        @inject(TYPES.MediatorService) mediatorService: MediatorService
    ) {
        this.mediatorService = mediatorService;
    }

    /**
     * Set the provider after the handler has been instantiated.
     * 
     * @param provider - The ChatGptViewProvider instance.
     */
    public setProvider(provider: ChatGptViewProvider): void {
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
        if (!this.provider) {
            throw new Error("Provider is not set in ResponseHandler.");
        }
        const responseInMarkdown = this.provider.modelManager.isCodexModel;
        const updateResponse = (message: string) => {
            this.provider!.response += message;
            this.sendResponseUpdate();
        };

        try {
            await model.generate(prompt, additionalContext, updateResponse, 'advanced');
            await this.mediatorService.send(new AddChatHistoryMessageRequest(MessageRole.User, prompt));
            await this.finalizeResponse(options);
        } catch (error) {
            this.provider.logger.logError(error, "Error in handleChatResponse", true);
            await this.mediatorService.send(new HandleApiErrorRequest(
                error,
                options,
                (message: any) => this.mediatorService.send(new SendMessageRequest(message)),
                this.provider.configurationManager
            ));
        }
    }

    /**
     * Finalizes the response after processing and updates the chat history.
     * 
     * @param options - Options related to the API call, including command and previous answer.
     * @returns A promise that resolves when the response has been finalized.
     */
    private async finalizeResponse(options: { command: string; previousAnswer?: string; }) {
        if (!this.provider) {
            throw new Error("Provider is not set in ResponseHandler.");
        }

        if (options.previousAnswer != null) {
            this.provider.response = options.previousAnswer + this.provider.response; // Combine with previous answer
        }

        // Mediate adding assistant message to chat history
        await this.mediatorService.send(new AddChatHistoryMessageRequest(MessageRole.Assistant, this.provider.response));

        if (this.isResponseIncomplete()) {
            await this.promptToContinue(options);
        }

        this.sendResponseUpdate(true); // Send final response indicating completion
        this.provider.response = '';
    }

    /**
     * Sends a response update to the webview.
     * 
     * @param done - Indicates if the response is complete.
     */
    private async sendResponseUpdate(done: boolean = false) {
        if (!this.provider) {
            throw new Error("Provider is not set in ResponseHandler.");
        }

        const message = {
            type: "addResponse",
            value: this.provider.response,
            done,
            id: this.provider.currentMessageId,
            autoScroll: this.provider.configurationManager.autoScroll,
            responseInMarkdown: !this.provider.modelManager.isCodexModel,
        };

        // Mediate sending the message
        await this.mediatorService.send(new SendMessageRequest(message));
    }

    /**
     * Checks if the response is incomplete based on markdown formatting.
     * 
     * @returns True if the response is incomplete; otherwise, false.
     */
    private isResponseIncomplete(): boolean {
        if (!this.provider) {
            throw new Error("Provider is not set in ResponseHandler.");
        }

        return this.provider.response.split("```").length % 2 === 0;
    }

    /**
     * Prompts the user to continue if the response is incomplete.
     * 
     * @param options - Options related to the API call, including command.
     * @returns A promise that resolves when the user has made a choice.
     */
    private async promptToContinue(options: { command: string; }) {
        if (!this.provider) {
            throw new Error("Provider is not set in ResponseHandler.");
        }

        const choice = await vscode.window.showInformationMessage(
            "It looks like the response was incomplete. Would you like to continue?",
            "Continue",
            "Cancel"
        );

        if (choice === "Continue") {
            // Mediate sending another API request to continue
            await this.mediatorService.send(new SendApiRequest("Continue", {
                command: options.command,
                code: undefined,
                previousAnswer: this.provider.response,
            }));
        }
    }
}