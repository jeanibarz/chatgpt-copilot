// File: src/responseHandler.ts

import { IChatModel } from './llm_models/IChatModel';
import { ChatGptViewProvider } from './chatgptViewProvider';

/**
 * The `ResponseHandler` class manages the chat response, including processing, updating, 
 * and finalizing the response in the webview.
 */
export class ResponseHandler {
    private provider: ChatGptViewProvider;

    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Handles the chat response by sending the message to the model and updating the response.
     * 
     * @param model - The chat model to send the message to.
     * @param prompt - The prompt to send.
     * @param additionalContext - Additional context for the prompt.
     * @param options - Options related to the API call.
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
            await this.finalizeResponse(options);
        } catch (error) {
            this.provider.handleApiError(error, prompt, options);
        }
    }

    /**
     * Finalizes the response after processing and updates the chat history.
     * 
     * @param options - Options related to the API call.
     */
    private async finalizeResponse(options: { command: string; previousAnswer?: string; }) {
        if (options.previousAnswer != null) {
            this.provider.response = options.previousAnswer + this.provider.response; // Combine with previous answer
        }

        this.provider.chatHistoryManager.addMessage('assistant', this.provider.response); // Add assistant response

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
     * @param options - Options related to the API call.
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
