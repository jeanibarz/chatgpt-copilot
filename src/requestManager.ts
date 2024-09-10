// File: src/requestManager.ts

import { ChatGptViewProvider } from './chatgptViewProvider';
import { IChatModel } from './llm_models/IChatModel';
import { Utility } from './utility';
import { ChatModelFactory } from './llm_models/chatModelFactory';
import { CommandType } from './chatgptViewProvider';

/**
 * The `RequestManager` class handles the API request logic for sending prompts and processing responses.
 */
export class RequestManager {
    private provider: ChatGptViewProvider;

    constructor(provider: ChatGptViewProvider) {
        this.provider = provider;
    }

    /**
     * Sends an API request to generate a response to the provided prompt.
     * 
     * @param prompt - The prompt to be sent to the API.
     * @param options - Additional options related to the API call, including command, code, etc.
     */
    public async sendApiRequest(
        prompt: string,
        options: {
            command: string;
            code?: string;
            previousAnswer?: string;
            language?: string;
        },
    ) {
        // Focus the webview if not already focused
        await this.provider.commandHandler.executeCommand(CommandType.ShowConversation, {});

        if (this.provider.inProgress) {
            return; // Prevent new requests if one is already in progress
        }

        this.provider.inProgress = true;
        this.provider.abortController = new AbortController();

        this.provider.questionCounter++;
        this.provider.logger.info("api-request-sent", {
            "chatgpt.command": options.command,
            "chatgpt.hasCode": String(!!options.code),
            "chatgpt.hasPreviousAnswer": String(!!options.previousAnswer),
        });

        try {
            if (!(await this.provider.conversationManager.prepareConversation())) {
                return;
            }
        } catch (error) {
            this.provider.logger.logError(error, "Failed to prepare conversation", true);
            return;
        }

        this.provider.response = "";

        let additionalContext = "";
        try {
            additionalContext = await this.provider.contextManager.retrieveContextForPrompt();
        } catch (error) {
            this.provider.logger.logError(error, "Failed to retrieve context for prompt", true);
            return;
        }

        const formattedQuestion = await this.provider.processQuestion(prompt, options.code, options.language);

        // If the ChatGPT view is not in focus/visible, focus on it to render Q&A
        try {
            if (this.provider.webView == null) {
                vscode.commands.executeCommand("chatgpt-copilot.view.focus");
            } else {
                this.provider.webView?.show?.(true);
            }
        } catch (error) {
            this.provider.logger.logError(error, "Failed to focus or show the ChatGPT view", true);
        }

        this.provider.logger.info("Preparing to create chat model...");

        const modelType = this.provider.modelManager.model;
        const modelConfig = this.provider.modelManager.modelConfig;

        this.provider.logger.info(`Model Type: ${modelType}`);
        this.provider.logger.info(`Model Config: ${JSON.stringify(modelConfig)}`);

        let chatModel: IChatModel;
        try {
            chatModel = await ChatModelFactory.createChatModel(this.provider, modelConfig);
        } catch (error) {
            this.provider.logger.logError(error, "Failed to create chat model", true);
            return;
        }

        this.provider.logger.info('Chat model created successfully');

        this.provider.sendMessage({
            type: "showInProgress",
            inProgress: this.provider.inProgress,
            showStopButton: true,
        });
        this.provider.currentMessageId = Utility.getRandomId();

        try {
            this.provider.sendMessage({
                type: "addQuestion",
                value: prompt,
                code: options.code,
                autoScroll: this.provider.configurationManager.autoScroll,
            });
            this.provider.logger.info('handle chat response...');
            await this.provider.responseHandler.handleChatResponse(chatModel, formattedQuestion, additionalContext, options); 
        } catch (error: any) {
            this.provider.logger.logError(error, "Error in handleChatResponse", true);
            this.provider.handleApiError(error, formattedQuestion, options);
        } finally {
            this.provider.inProgress = false;
            this.provider.sendMessage({ type: "showInProgress", inProgress: this.provider.inProgress });
        }
    }
}
