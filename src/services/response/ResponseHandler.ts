// src/services/response/ResponseHandler.ts

/**
 * This module handles responses for chat interactions, 
 * to manage updates and interactions with the chat model.
 */

import { inject, injectable } from "inversify";
import * as vscode from 'vscode';
import { ErrorHandler } from "../../errors/ErrorHandler";
import TYPES from "../../inversify.types";
import { ChatModelFactory } from "../../models/llm_models";
import { ModelManager } from '../../models/ModelManager';
import { Utility } from "../../Utility";
import { KnowledgeEnhancedResponseGenerator } from "../../workflows/KnowledgeEnhancedResponseGenerator";
import { ConfigurationManager } from '../ConfigurationManager';

/**
 * The `ResponseHandler` class is responsible for managing chat responses.
 * Handle updates and interactions 
 * with the chat model and manages response updates and error handling.
 */
@injectable()
export class ResponseHandler {
    private response: string = '';
    private currentMessageId?: string;

    /**
     * Constructor for the `ResponseHandler` class.
     * Initializes a new instance of ResponseHandler with the mediator service.
     * 
     * @param errorHandler - ErrorHandler to handle any errors during the process.
     * @param modelManager - An instance of ModelManager to manage the model interactions.
     * @param configurationManager - Configuration manager to handle the configuration settings.
     */
    constructor(
        @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler,
        @inject(TYPES.ModelManager) private modelManager: ModelManager,
        @inject(TYPES.ConfigurationManager) private configurationManager: ConfigurationManager
    ) { }

    /**
     * Handles the chat response by sending the message to the model and updating the response.
     * 
     * @param prompt - The prompt to send.
     * @param additionalContext - Additional context for the prompt.
     * @param options - Options related to the API call, including command and previous answer.
     * @returns A promise that resolves when the chat response has been handled.
     */
    public async handleChatResponse(
        prompt: string,
        additionalContext: string,
        options: { command: string; previousAnswer?: string; }
    ) {
        this.currentMessageId = Utility.getRandomId();
        const responseInMarkdown = this.modelManager.isCodexModel;
        const updateResponse = (message: string) => {
            this.response += message;
            this.sendResponseUpdate();
        };

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Thinking",
                cancellable: true
            }, async (progress, token) => {
                const chatModel = await ChatModelFactory.createChatModel();
                const generator = new KnowledgeEnhancedResponseGenerator(chatModel);

                // Pass the progress reporter and token to the generate method
                await generator.generate(prompt, updateResponse, progress, token);

                // After generation is complete
                await this.finalizeResponse(options);
            });
        } catch (error) {
            if ((error as Error).message === 'Operation canceled by the user.') {
                console.info('User canceled the operation.');
            } else {
                await this.errorHandler.handleApiError(error, options, (message: any) => this.sendResponseUpdate.bind(this)(message));
            }
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
            this.response = options.previousAnswer + this.response; // Combine with previous answer
        }

        if (this.isResponseIncomplete()) {
            await this.promptToContinue(options);
        }

        this.sendResponseUpdate(true); // Send final response indicating completion
        this.response = '';
        this.currentMessageId = undefined;
    }

    /**
     * Sends a response update to the webview.
     * 
     * @param done - Indicates if the response is complete.
     */
    private async sendResponseUpdate(done: boolean = false) {
        const message = {
            type: "addResponse",
            value: this.response,
            done,
            id: this.currentMessageId,
            autoScroll: this.configurationManager.autoScroll,
            responseInMarkdown: !this.modelManager.isCodexModel,
        };

        (await Utility.getProvider()).sendMessage({
            ...message,
            autoScroll: message.autoScroll ?? undefined
        });
    }

    /**
     * Checks if the response is incomplete based on markdown formatting.
     * 
     * @returns True if the response is incomplete; otherwise, false.
     */
    private isResponseIncomplete(): boolean {
        return this.response.split("```").length % 2 === 0;
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
            await (await Utility.getProvider()).sendApiRequest("Continue", {
                command: options.command,
                code: undefined,
                previousAnswer: this.response,
            });
        }
    }
}