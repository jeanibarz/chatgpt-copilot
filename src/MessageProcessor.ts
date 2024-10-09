// src/MessageProcessor.ts

/**
 * This module handles the processing of user questions and manages the 
 * interaction with the ChatGPT view provider. It formats questions with 
 * additional context and sends them to the webview for display.
 */

import { inject, injectable } from "inversify";
import TYPES from "./inversify.types";
import { CoreLogger } from "./logging/CoreLogger";
import { ConfigurationManager } from "./services/ConfigurationManager";
import { ChatGptViewProvider } from "./view";

@injectable()
export class MessageProcessor {
    private logger: CoreLogger = CoreLogger.getInstance();

    constructor(
        @inject(TYPES.ConfigurationManager) private configurationManager: ConfigurationManager,
    ) {
        this.logger.info("MessageProcessor initialized");
    }

    /**
     * Processes the provided question, appending contextual information from the current project files.
     * 
     * @param question - The original question to process.
     * @param code - Optional code block associated with the question.
     * @param language - Optional programming language of the provided code.
     * @returns A Promise that resolves to the processed question string.
     */
    public processQuestion(question: string, code?: string, language?: string) {
        this.logger.info("Processing user question", { questionLength: question.length, hasCode: !!code, language });

        // Format the question to send, keeping the context separate
        const formattedQuestion = code != null
            ? `${question}${language ? ` (The following code is in ${language} programming language)` : ""}: ${code}`
            : question;

        this.logger.info("Question processed successfully", { formattedQuestionLength: formattedQuestion.length });
        return formattedQuestion;
    }

    /**
     * Adds the user's question to the webview for display.
     *
     * @param provider - The ChatGptViewProvider.
     * @param prompt - The user's prompt.
     * @param code - Optional code associated with the prompt.
     */
    public async addQuestionToWebview(provider: ChatGptViewProvider, prompt: string, code?: string) {
        this.logger.info("Adding question to webview", { promptLength: prompt.length, hasCode: !!code });

        await provider.sendMessage({
            type: "addQuestion",
            value: prompt,
            code: code,
            autoScroll: this.configurationManager.autoScroll ?? true,
        });

        this.logger.info("Question successfully added to webview");
    }
}